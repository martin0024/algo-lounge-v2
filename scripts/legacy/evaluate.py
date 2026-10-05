# Loaded into Pyodide by scripts/legacy/migrate.ts. For one legacy question:
#
#   1. "old" — replay every test exactly like the legacy site did (solution,
#      prepare and verify share one namespace; verify gets the prepared args
#      when it takes three parameters) and record whether it passed. This is
#      the proof that the reference solution and the legacy test data agree.
#   2. "new" — run the same case the way the v2 judge will (separate user and
#      harness namespaces, prepare → invoke/call → serialize → JSON) and
#      record the JSON answer. That answer becomes `expected` in tests.json.

import copy
import inspect
import io
import json
import tokenize


def rename_identifier(source, old, new):
    """Rename a NAME token everywhere (defs, calls, recursion), leaving
    strings and comments alone."""
    if old == new or not source.strip():
        return source
    out = []
    tokens = tokenize.generate_tokens(io.StringIO(source).readline)
    for tok in tokens:
        if tok.type == tokenize.NAME and tok.string == old:
            tok = tok._replace(string=new)
        out.append(tok)
    return tokenize.untokenize(out)


def _jsonify(value):
    # Same conversion the judge does: json.dumps, then back.
    return json.loads(json.dumps(value))


def _describe(error):
    return f"{type(error).__name__}: {error}"


def run_old(spec):
    results = []
    for case in spec["cases"]:
        ns = {}
        try:
            exec(spec["oldSolution"], ns)
            exec(spec["prepare"], ns)
            exec(spec["verify"], ns)
            fn = ns.get(spec["oldEntry"])
            if fn is None:
                raise NameError(f"{spec['oldEntry']} is not defined")
            args = ns["prepare"](copy.deepcopy(case["input"]))
            actual = fn(*args)
            verify = ns["verify"]
            if len(inspect.signature(verify).parameters) >= 3:
                verdict = verify(actual, case["output"], args)
            else:
                verdict = verify(actual, case["output"])
            results.append({"pass": bool(verdict[0]), "shown": str(verdict[1])})
        except Exception as error:  # noqa: BLE001 — report, never crash
            results.append({"pass": False, "error": _describe(error)})
    return results


def run_new(spec):
    convert_ns = {}
    if spec.get("convert"):
        exec(spec["convert"], convert_ns)
    convert = convert_ns.get("convert")

    results = []
    for case in spec["cases"]:
        try:
            if convert:
                v2_input = convert(copy.deepcopy(case["input"]))
            else:
                v2_input = [case["input"][key] for key in spec["argKeys"]]
            v2_input = _jsonify(v2_input)
        except Exception as error:  # noqa: BLE001
            results.append({"error": "convert: " + _describe(error)})
            continue

        user_ns = {}
        harness_ns = {}
        try:
            exec(spec["newSolution"], user_ns)
            if spec.get("harness"):
                exec(spec["harness"], harness_ns)
            fn = user_ns.get(spec["pyName"])
            if not callable(fn):
                raise NameError(f"{spec['pyName']} is not defined")
            prepare = harness_ns.get("prepare")
            serialize = harness_ns.get("serialize")
            invoke = harness_ns.get("invoke")
            args = json.loads(json.dumps(v2_input))
            if prepare:
                args = prepare(args)
            result = invoke(fn, args, user_ns) if invoke else fn(*args)
            got = serialize(result, args) if serialize else result
            results.append({"input": v2_input, "got": _jsonify(got)})
        except Exception as error:  # noqa: BLE001
            results.append({"input": v2_input, "error": _describe(error)})
    return results


def evaluate(spec_json):
    spec = json.loads(spec_json)
    return json.dumps({"old": run_old(spec), "new": run_new(spec)})


def strip_function(source, name):
    """Drop a top-level `def name(...)` (legacy design questions shipped a
    test driver next to the class; v2's design harness replaces it)."""
    import ast

    tree = ast.parse(source)
    lines = source.split("\n")
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == name:
            start = (node.decorator_list[0].lineno if node.decorator_list else node.lineno) - 1
            del lines[start : node.end_lineno]
            break
    return "\n".join(lines).strip() + "\n"
