const userService = require("../services/user.services");

async function register(req, res) {
    try {
        const { name, email, password } = req.body;
        const user = await userService.createUser({ name, email, password });

        return res.status(201).json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao criar usuário" });
    }
}

async function login(req, res) {
    try{
        const { email, password } = req.body;
        const user = await userService.login({email, password});

        return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(400).json({
            error: error.message
        });
    }
        }

module.exports = {
    register,
    login
};