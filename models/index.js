import RideSharingApp from "../RideSharingApp.js";
import RideEventManager from "./RideEventManager.js";
import UserFactory from "./UserFactory.js";
import Driver from "./Driver.js";
import VIPDriver from "./VIPDriver.js";
import PremiumUser from "./PremiumUser.js";
import Ride from "./Ride.js";

// manual checks
(async () => {
    // Ensure Singleton pattern
    const app = RideSharingApp.getInstance();
    const app2 = RideSharingApp.getInstance();
    console.log(app === app2);

    // fetch drivers
    try {
        await app.getDrivers();
        console.log('Drivers fetched and available');
    } catch (error) {
        console.error('Failed to fetch drivers:', error.message);
    }

    // ensure both regular and VIP drivers exist
    await app.getDrivers();
    const { regular, vip } = app.getAllDrivers();
    console.log(regular.size > 0, vip.size > 0);

    // request a driver and ensure it's marked as unavailable after a ride starts (wait for the delay)
    const driverBefore = await app.getAvailableDriver();
    console.log(driverBefore.isAvailable); // Should be true

    const userTest = UserFactory.createUser("TestUser");
    const rideTest = await app.createRide(userTest, "A", "B");

    console.log(driverBefore.isAvailable); // should be false

    // ensure users are properly upgraded after reaching the threshold

    const user = UserFactory.createUser("TestUser2");
    console.log(user instanceof PremiumUser); // Should be false
    UserFactory.addUserSpending(user, 120); // Exceeds premium threshold
    const upgradedUser = UserFactory.getUser(user.id);
    console.log(upgradedUser instanceof PremiumUser); // Should be true


    // Create users using the UserFactory (happy path)
    const user1 = await UserFactory.createUser("Bobi");
    const user2 = await UserFactory.createUser("Ani");
    const user3 = await UserFactory.createUser("Georgi");
    const user4 = await UserFactory.createUser("Ivan");

    // Attempt user creation through the User class (should throw an error)
    try {
        const user2 = new User('InvalidKey', 2, 'Ani');
    } catch (error) {
        console.error(error.message);
    }

    // Attempt Premium user creation through the PremiumUser class (should throw an error)
    try {
        const premiumUser = new PremiumUser('InvalidKey', 3, 'Nikolay');
    } catch (error) {
        console.error(error.message);
    }

    // check fares
    const premiumUser = UserFactory.createUser("RichUser");
    UserFactory.addUserSpending(premiumUser, 200); // Upgrade to Premium

    const driver = new Driver("RegularDriver", "123");
    const vipDriver = new VIPDriver("VIPDriver", "456");

    const ride1 = new Ride(premiumUser, "Point A", "Point B");
    console.log(ride1.calculateFare(driver)); // Should be 20% less than normal

    const ride2 = new Ride(premiumUser, "Point A", "Point B");
    console.log(ride2.calculateFare(vipDriver)); // Should be 20% less + VIP multiplier

    // check notifications
    class TestObserver {
        update(message) {
            console.log("Notification received:", message);
        }
    }

    const testObserverUser = new TestObserver();
    const testObserverDriver = new TestObserver();
    const rideEventManager = new RideEventManager();

    rideEventManager.subscribe(1, testObserverUser, "user");
    rideEventManager.subscribe(1, testObserverDriver, "driver");

    rideEventManager.notify(1, "User Message", "Driver Message");
    // "Notification received: User Message" and "Notification received: Driver Message"


    // ensure VIP driver preference works
    const vipUser = UserFactory.createUser("VIP User");
    const ride = await app.createRide(vipUser, "Downtown", "Airport", true);
    console.log(ride.driver instanceof VIPDriver || ride.driver instanceof Driver);


    // GENERAL HAPPY PATH SIMULATION
    // Create rides for users - each one should notify both the driver and the user + display a general message
    // make user 'Bobi' premium
    try {
        await app.createRide(user1, "Downtown", "Airport");
        await app.createRide(user2, "Home", "Office", true);
        await app.createRide(user3, "School", "Home", true);
        await app.createRide(user4, "Suburb", "City Center", true);
        await app.createRide(user1, "Suburb", "City Center", true);
        await app.createRide(user1, "Airport", "Downtown", true);
        await app.createRide(user1, "Airport", "Downtown", true);
        await app.createRide(user1, "Airport", "Downtown", true);
    } catch (error) {
        console.error(error.message);
    }

    // Complete all rides - each one should notify both the driver and the user
    const activeRides = Array.from(app.getActiveRides().values());
    for (const ride of activeRides) {
        app.completeRide(ride);
    }

})();