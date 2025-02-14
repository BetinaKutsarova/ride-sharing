import User from "./User.js";
import PremiumUser from "./PremiumUser.js";

class UserFactory {
    // Private static key to enforce the creation of user/premium user only through the factory
    static #USER_KEY = Symbol('UserKey');
    static #PREMIUM_THRESHOLD = 100;
    static #userSpending = new Map();
    static #activeUsers = new Map();

    static createUser(name) {
        const id = crypto.randomUUID();
        const user = new User(UserFactory.#USER_KEY, id, name);
        UserFactory.#activeUsers.set(id, user);
        console.log(`New user created - ${name}`);
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
        const premiumUser = new PremiumUser(UserFactory.#USER_KEY, user.id, user.name);
        UserFactory.#activeUsers.set(user.id, premiumUser);
        console.log(`${user.name} has been upgraded to Premium status! They are now eligible for a Premium Client discount of 20%`);
        return premiumUser;
    }

    static getUserKey() {
        return this.#USER_KEY;
    }

    static getUser(id) {
        return UserFactory.#activeUsers.get(id);
    }

    static getUserSpending(id) {
        return UserFactory.#userSpending.get(id) || 0;
    }
}

export default UserFactory;