import UserFactory from "./UserFactory.js";

class User {

    #id;
    #name;

    constructor(key, id, name) {
        if (key !== UserFactory.getUserKey()) {  // Prevents direct creation
            throw new Error("User instances must be created through UserFactory!");
        }
        this.#id = id;
        this.#name = name;
    }

    get id() {
        return this.#id;
    }

    get name() {
        return this.#name;
    }


    getTotalSpending() {
        return UserFactory.getUserSpending(this.id);
    }

    update(message) {
        console.log(message);
    }
}

export default User;