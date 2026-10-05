# Runs a small script of statements against the user's factories:
#   "carFactory = CarFactory()"            → construct a factory
#   "myCar = carFactory.createVehicle()"   → ask it for a vehicle
#   "myCar.getType()"                      → record the vehicle's type
# One result per statement (None for assignments).


def invoke(car_factory, args, user):
    (operations,) = args
    factories, vehicles, results = {}, {}, []
    for op in operations:
        if "=" in op:
            name, expr = (part.strip() for part in op.split("=", 1))
            if expr.endswith(".createVehicle()"):
                vehicles[name] = factories[expr.split(".")[0]].createVehicle()
            else:
                factories[name] = user[expr.replace("()", "").strip()]()
            results.append(None)
        elif op.strip().endswith(".getType()"):
            results.append(vehicles[op.strip()[: -len(".getType()")]].getType())
    return results
