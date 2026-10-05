// Runs a small script of statements against the user's factories:
//   "carFactory = CarFactory()"            → construct a factory
//   "myCar = carFactory.createVehicle()"   → ask it for a vehicle
//   "myCar.getType()"                      → record the vehicle's type
// One result per statement (null for assignments).

type Obj = Record<string, () => unknown>

export function invoke(
  _carFactory: unknown,
  args: unknown[],
  user: Record<string, unknown>
) {
  const [operations] = args as [string[]]
  const factories: Record<string, Obj> = {}
  const vehicles: Record<string, Obj> = {}
  const results: unknown[] = []
  for (const raw of operations) {
    const op = raw.trim()
    if (op.includes("=")) {
      const [name, expr] = op.split("=", 2).map((part) => part.trim())
      if (expr.endsWith(".createVehicle()")) {
        vehicles[name] = factories[expr.split(".")[0]].createVehicle() as Obj
      } else {
        const Factory = user[expr.replace("()", "").trim()] as new () => Obj
        factories[name] = new Factory()
      }
      results.push(null)
    } else if (op.endsWith(".getType()")) {
      results.push(vehicles[op.slice(0, -".getType()".length)].getType())
    }
  }
  return results
}
