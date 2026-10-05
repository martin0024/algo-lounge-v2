from abc import ABC, abstractmethod

class Vehicle(ABC):
    @abstractmethod
    def getType(self) -> str:
        pass

class Car(Vehicle):
    def getType(self) -> str:
        return "Car"

class Bike(Vehicle):
    def getType(self) -> str:
        return "Bike"

class Truck(Vehicle):
    def getType(self) -> str:
        return "Truck"

class VehicleFactory(ABC):
    @abstractmethod
    def createVehicle(self) -> Vehicle:
        pass

class CarFactory(VehicleFactory):
    # Write your code here
    pass

class BikeFactory(VehicleFactory):
    # Write your code here
    pass

class TruckFactory(VehicleFactory):
    # Write your code here
    pass
