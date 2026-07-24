const userService = require("../services/user.services");

async function register(req, res) {
    try {
        const { name, email, password, cargo, grupo } = req.body;
        const user = await userService.createUser({ name, email, password, cargo, grupo });

        return res.status(201).json(user);
    } catch (error) {
        console.error(error);
        const status = error.code === "23505" ? 409 : 400;
        return res.status(status).json({ message: error.code === "23505" ? "E-mail já cadastrado" : error.message });
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

async function listUsers(req, res) {
    try {
        const users = await userService.listUsers();
        return res.status(200).json({ users });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao listar usuários" });
    }
}

module.exports = {
    register,
    login,
    listUsers
};
