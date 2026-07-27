const userService = require("../services/user.services");

async function register(req, res) {
    try {
        const { name, email, password, cargo, grupo } = req.body;
        const user = await userService.createUser({ name, email, password, cargo, grupo });

        return res.status(201).json(user);
    } catch (error) {
        console.error(error);
        const status = error.statusCode || (error.code === "23505" ? 409 : 400);
        return res.status(status).json({
            error: error.code === "23505"
                ? "E-mail já cadastrado"
                : error.message || "Erro ao cadastrar usuário"
        });
    }
}

async function login(req, res) {
    try{
        const { email, password } = req.body;
        const user = await userService.login({email, password});

        return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(error.statusCode || 401).json({
            error: error.message || "E-mail ou senha inválidos"
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

async function me(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: "Usuário não autenticado" });
        }

        const user = await userService.getUserById(req.user.id);
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(error.statusCode || 404).json({
            error: error.message || "Usuário não encontrado"
        });
    }
}

async function updateUser(req, res) {
    try {
        const user = await userService.updateUser(req.params.id, req.body);
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            error: error.message || "Erro ao atualizar usuário"
        });
    }
}

module.exports = {
    register,
    login,
    me,
    listUsers,
    updateUser
};
