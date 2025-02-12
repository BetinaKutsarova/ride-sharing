const DRIVERS_API_URL = "https://jsonplaceholder.typicode.com/users";
const USERS_API_URL = "https://randomuser.me/api/";

class RideSharingApp {
    static #instance = null;
    #activeRides = new Map();
    #availableDrivers = new Map();

    constructor() {
        if (RideSharingApp.#instance) {
            return RideSharingApp.#instance;
        }
        
        RideSharingApp.#instance = this;
    }

    static getInstance() {
        if (!RideSharingApp.#instance) {
            RideSharingApp.#instance = new RideSharingApp();
        }
        return RideSharingApp.#instance;
    }

    async getDrivers() {
        try {
            const response = await fetch(DRIVERS_API_URL);
            const driversData = await response.json();
            driversData.forEach(data => {
                const driver = new Driver(data.name, data.id);
                this.#availableDrivers.set(data.id, driver);
            });
        } catch (error) {
            console.error('Error fetching drivers!', error);
            throw error;
        }
    }

    getAvailableDriver() {
        for (const [_, driver] of this.#availableDrivers) {
            if (driver.isAvailable) {
                return driver;
            }
        }
        return null;
    }

    getAllDrivers() {
        return this.#availableDrivers;
    }

    getActiveRides() {
        return this.#activeRides;
    }

    createRide(user, pickupLocation, dropoffLocation) {
        const ride = new Ride(user, pickupLocation, dropoffLocation);
        const availableDriver = this.getAvailableDriver();
        
        if (availableDriver) {
            ride.assignDriver(availableDriver);
            availableDriver.isAvailable = false;
            this.#activeRides.set(ride.id, ride);
        } else {
            throw new Error("All drivers are busy, please try again later.");
        }
        
        console.log(`Ride created for ${user.name} from ${pickupLocation} to ${dropoffLocation}.`);

        return ride;
    }

    completeRide(ride) {
        ride.complete();
        if (ride.driver) {
            ride.driver.isAvailable = true;
        }
        this.#activeRides.delete(ride.id);
    }
}

class User {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }

    getTotalSpending() {
        return UserFactory.getUserSpending(this.id);
    }
}

class PremiumUser extends User {
    #discountPercentage = 20;

    constructor(id, name) {
        super(id, name);
    }

    getDiscount() {
        return this.#discountPercentage;
    }
}

class UserFactory {
    static #PREMIUM_THRESHOLD = 1000;
    static #userSpending = new Map();
    static #activeUsers = new Map();

    static async fetchAndCreateUser() {
        try {
            const response = await fetch(`${USERS_API_URL}`);
            const data = await response.json();
            const userData = data.results[0];
            
            const userId = userData.login.uuid; // generates an id for the user
            const name = `${userData.name.first} ${userData.name.last}`;
            
            return this.createUser(userId, name);
        } catch (error) {
            console.error('Error fetching user!', error);
            throw error;
        }
    }

    static createUser(id, name) {
        const user = new User(id, name);
        UserFactory.#activeUsers.set(id, user);
        return user;
    }

    static addUserSpending(user, amount) {
        const currentSpending = UserFactory.#userSpending.get(user.id) || 0;
        const newSpending = currentSpending + amount;
        UserFactory.#userSpending.set(user.id, newSpending);

        if (newSpending >= UserFactory.#PREMIUM_THRESHOLD && !(user instanceof PremiumUser)) {
            return UserFactory.#upgradeUserToPremium(user);
        }
        return user;
    }

    static #upgradeUserToPremium(user) {
        const premiumUser = new PremiumUser(user.id, user.name);
        UserFactory.#activeUsers.set(user.id, premiumUser);
        console.log(`Congratulations! ${user.name} has been upgraded to Premium status!`);
        return premiumUser;
    }

    static getUserSpending(userId) {
        return UserFactory.#userSpending.get(userId) || 0;
    }

    static getUser(id) {
        return UserFactory.#activeUsers.get(id);
    }
}

class Ride {
    static #nextId = 1;
    id;

    constructor(user, pickupLocation, dropoffLocation) {
        this.id = Ride.#nextId++;
        this.userId = user.id;
        this.pickupLocation = pickupLocation;
        this.dropoffLocation = dropoffLocation;
        this.status = "pending";
        this.driver = null;
        this.fare = this.calculateFare();
    }

    get user() {
        return UserFactory.getUser(this.userId);
    }

    calculateFare() {
        const baseFare = Math.floor(Math.random() * 41) + 10;
        if (this.user instanceof PremiumUser) {
            const discount = this.user.getDiscount();
            return baseFare * (1 - discount / 100);
        }
        return baseFare;
    }

    assignDriver(driver) {
        this.driver = driver;
        this.status = "active";
    }

    complete() {
        this.status = "completed";
        let user = this.user;
        user = UserFactory.addUserSpending(user, this.fare);
        console.log(`Ride completed. Fare: $${this.fare}`);
        console.log(`Total spending for ${user.name}: $${user.getTotalSpending()}`);
    }
}

class Driver {
    #balance = 0;

    constructor(name, id) {
        this.name = name;
        this.id = id;
        this.isAvailable = true;
    }

    getBalance() {
        return this.#balance;
    }

    addToBalance(amount) {
        this.#balance += amount;
    }
}

class VIPDriver extends Driver {
    #premiumRate = 1.5;

    constructor(name, id, balance) {
        super(name, id, balance);
    }

    getPremiumRate() {
        return this.#premiumRate;
    }
}

(async () => {
    const app = RideSharingApp.getInstance();

    // Fetch drivers from the API
    await app.getDrivers();
    console.log("Drivers fetched and available.");

    // Create users using the UserFactory
    const user1 = await UserFactory.fetchAndCreateUser();
    const user2 = await UserFactory.fetchAndCreateUser();
    console.log(`Users created: ${user1.name}, ${user2.name}`);

    // Request rides for users
    try {
        const ride1 = app.createRide(user1, "Downtown", "Airport");
        const ride2 = app.createRide(user2, "Suburb", "City Center");
    } catch (error) {
        console.error(error.message);
    }

    // Check active rides
    console.log(app.getActiveRides());

    console.log(app.getAllDrivers());

    // Complete all rides
    const activeRides = Array.from(app.getActiveRides().values());
    for (const ride of activeRides) {
        app.completeRide(ride);
    }

    
})();