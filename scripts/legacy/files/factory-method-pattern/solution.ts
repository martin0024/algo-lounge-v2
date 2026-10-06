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
  createVehicle(): Vehicle {
    return new Car()
  }
}

export class BikeFactory extends VehicleFactory {
  createVehicle(): Vehicle {
    return new Bike()
  }
}

export class TruckFactory extends VehicleFactory {
  createVehicle(): Vehicle {
    return new Truck()
  }
}
