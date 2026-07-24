export function getUser(){
    const user = localStorage.getItem("accesmanager:user");
    return user ? JSON.parse(user) : null;

}

export function getToken(){
    return localStorage.getItem("accesmanager:token");
}

export function logout(){
    localStorage.removeItem("accesmanager:token");
    localStorage.removeItem("accesmanager:user");
}