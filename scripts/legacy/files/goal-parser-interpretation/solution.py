def interpret(command: str) -> str:
    return command.replace("()", "o").replace("(al)", "al")
