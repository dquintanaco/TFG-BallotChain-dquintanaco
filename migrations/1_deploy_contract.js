// Importa el contrato 'BallotChain' utilizando la función 'artifacts.require' que proporciona Truffle
// Esto permite que el script de migración acceda a la ABI y bytecode del contrato para su despliegue
const BallotChain = artifacts.require("BallotChain");

// 'module.exports' expone esta función para que Truffle pueda ejecutarla
// La función es pasada al módulo de despliegue de Truffle para manejar la lógica de despliegue del contrato
module.exports = function (deployer){
    // 'deployer' es un objeto proporcionado por Truffle que maneja el despliegue de contratos
    // 'deployer.deploy' es una función que toma un contrato como argumento y lo despliega en la blockchain
    // Aquí, se está desplegando el contrato 'BallotChain'
    deployer.deploy(BallotChain);
};