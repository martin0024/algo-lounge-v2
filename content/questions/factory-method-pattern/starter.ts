export abstract class Vehicle {
  abstract getType(): string
}

export class Car extends Vehicle {
  getType(): string {
    return "Car"
  }
}

export class Bike extends Vehicle {
  getType(): string {
    return "Bike"
  }
}

export class Truck extends Vehicle {
  getType(): string {
    return "Truck"
  }
}

export abstract class VehicleFactory {
  abstract createVehicle(): Vehicle
}

export class CarFactory extends VehicleFactory {
  // Write your code here
  createVehicle(): Vehicle {
    throw new Error("Not implemented")
  }
}

export class BikeFactory extends VehicleFactory {
  // Write your code here
  createVehicle(): Vehicle {
    throw new Error("Not implemented")
  }
}

export class TruckFactory extends VehicleFactory {
  // Write your code here
  createVehicle(): Vehicle {
    throw new Error("Not implemented")
  }
}
