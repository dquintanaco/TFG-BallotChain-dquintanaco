// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;

contract BallotChain {
    // Dirección del dueño y creador del contrato
    address private owner;

    // Constructor
    constructor() {
        owner = msg.sender;  // Establece al creador del contrato como propietario
    }

    // Modificador que permite solo al propietario ejecutar una función
    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el propietario puede ejecutarlo.");
        _;
    }
    // Array para almacenar los hashes de los IDs de los candidatos registrados
    string[] private candidatesID;

    // Asocia el ID único del candidato (hash) con el nombre completo o representación deseada del candidato
    mapping(bytes32 => string) IDcandidate;

    // Contabiliza los votos que cada candidato recibe, utilizando el hash del ID del candidato como clave
    mapping(bytes32 => uint256) private candidateVotes;

    // Mapping para verificar rápidamente si un ID de votante ya ha sido utilizado
    mapping(bytes32 => bool) private voterRegistered;

    // Mapping para verificar rápidamente si una wallet ya ha sido utilizada para votar
    mapping(bytes32 => bool) private walletUsed;

    // Función que permite verificar si la dirección que llama es el creador del contrato
    function isOwner() public view returns (bool) {
        return msg.sender == owner;
    }
    
    // Función para verificar si un votante está registrado
    function isCandidateRegistered(string memory cID) private view returns (bool) {
        // Genera el hash del ID del votante
        bytes32 candidateHash = keccak256(abi.encodePacked(cID));
        // Devuelve true si el nombre del candidato no está vacío
        return bytes(IDcandidate[candidateHash]).length > 0;
    }

    // Función para obtener los nombres de todos los candidatos registrados
    function getCandidates() public view returns (string[][] memory) {
        // Inicializa un array de strings en memoria con la misma longitud que el array de ID de candidatos
        string[][] memory candidate = new string[][](candidatesID.length);

        // Bucle para recorrer todos los IDs de candidatos
        for (uint i = 0; i < candidatesID.length; i++) {
            // Accede al nombre del candidato usando su ID desde el mapping y lo almacena en el array de resultados
            // candidateNames[i] = IDcandidate[candidatesID[i]];
            candidate[i] = new string[](2);
            candidate[i][0] = IDcandidate[keccak256(abi.encodePacked(candidatesID[i]))];
            candidate[i][1] = candidatesID[i]; 
        }

        // Devuelve el array con los nombres de todos los candidatos
        return candidate;
    }

    // Esta función permite añadir un nuevo candidato al sistema de votación
    function addCandidate(string memory cID, string memory name) public onlyOwner {
        // Verifica si el candidato ya esta registrado
        require(!isCandidateRegistered(cID), "El candidato ya esta registrado");

        // Calcula el hash del identificador único del candidato ('id') usando keccak256 para crear un identificador hash seguro
        bytes32 candidateIdHash = keccak256(abi.encodePacked(cID));
        
        // Asigna el nombre del candidato al hash del identificador en el mapping 'candidateID', 
        // relacionando así el identificador único del candidato con su nombre
        IDcandidate[candidateIdHash] = name;

        // Añade el nuevo hash del id del candidato a la lista
        candidatesID.push(cID);
    }


    // Función para añadir votos a un candidato
    function addVote(string memory cID) private {
        bytes32 candidateIdHash = keccak256(abi.encodePacked(cID));
        candidateVotes[candidateIdHash]++;
    }

    // Función para verificar si un votante está registrado
    function isVoterRegistered(string memory vID) public view returns (bool) {
        // Genera el hash del ID del votante
        bytes32 voterHash = keccak256(abi.encodePacked(vID));
        return voterRegistered[voterHash];
    }

    // Función para registrar un votante
    function registerVoter(string memory vID) private {
        // Genera el hash del ID del votante
        bytes32 voterHash = keccak256(abi.encodePacked(vID));
        voterRegistered[voterHash] = true;
    }

    // Función para verificar si una wallet ha sido usada para votar
    function isWalletUsed(address wallet) public view returns (bool) {
        // Genera el hash de la wallet
        bytes32 walletHash = keccak256(abi.encodePacked(wallet));
        return walletUsed[walletHash];
    }

    // Función para registrar el uso de una wallet
    function registerWallet(address wallet) private {
        // Genera el hash de la wallet
        bytes32 walletHash = keccak256(abi.encodePacked(wallet));
        walletUsed[walletHash] = true;
    }

    // Función para votar por un candidato
    function vote(string memory vID, string memory cID) public {
        // Verifica si el votante ya está registrado
        require(!isVoterRegistered(vID), "El votante ya ha votado.");
        
        // Verifica si la wallet ya ha sido usada para votar
        require(!isWalletUsed(msg.sender), "La wallet ya ha votado.");

        // Verifica si el candidato existe
        require(isCandidateRegistered(cID), "El candidato no existe");

        // Registra al votante
        registerVoter(vID);

        // Registra la wallet usada
        registerWallet(msg.sender);

        // Añade un voto al candidato especificado
        addVote(cID);
    }

    // Función para obtener la cantidad de votos de un candidato específico
    function getCandidateVotes(string memory cID) public view returns (uint) {
        // Devuelve el número de votos asociados al hash del ID del candidato
        // Si el candidato no existe o no tiene votos, se devolverá cero
        bytes32 candidateIdHash = keccak256(abi.encodePacked(cID));
        return candidateVotes[candidateIdHash];
    }

    // Función para determinar el ganador o identificar un empate
    function determineWinner() public view returns (string memory) {
        uint highestVotes = 0;
        string[] memory topCandidates = new string[](candidatesID.length);
        uint count = 0;

        // Itera sobre la lista de hashes de candidatos para encontrar la mayor cantidad de votos
        for (uint i = 0; i < candidatesID.length; i++) {
            bytes32 candidateIdHash = keccak256(abi.encodePacked(candidatesID[i]));
            uint candidateVotesCount = candidateVotes[candidateIdHash];
            string memory candidateName = IDcandidate[candidateIdHash];

            if (candidateVotesCount > highestVotes) {
                // Nuevo máximo encontrado, reiniciar la lista de líderes
                highestVotes = candidateVotesCount;
                topCandidates[0] = candidateName;
                count = 1;
            } else if (candidateVotesCount == highestVotes && highestVotes != 0) {
                // Empate, añadir este candidato a la lista de líderes
                topCandidates[count] = candidateName;
                count++;
            }
        }

        // Preparar el string para devolver los resultados
        if (highestVotes == 0) {
            return "No hay votos emitidos.";
        } else if (count == 1) {
            return topCandidates[0];
        } else {
            // Si hay empate, construir un string que liste los candidatos empatados
            string memory result = "Empate entre: ";
            for (uint i = 0; i < count; i++) {
                result = string(abi.encodePacked(result, topCandidates[i], (i < count - 1) ? ", " : ""));
            }
            return result;
        }
    }
}
