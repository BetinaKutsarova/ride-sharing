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

    update(message) {
        console.log(message)
    }
}

export default Driver;