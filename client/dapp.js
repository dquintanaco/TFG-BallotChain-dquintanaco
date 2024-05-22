// Extraer mensajes de error más legibles de las excepciones
const extractErrorMessage = (e) => {
    // Intenta extraer el mensaje de error más específico usando operadores lógicos para simplificar la estructura de control
    const rawError = e.message; // Extrae el mensaje de error crudo si está disponible
    const errorMessage = e.reason || // Usa 'reason' si está disponible directamente en el objeto
                        (rawError && rawError.match(/"reason"\s*:\s*"([^"]*)"/)?.[1]) || // Intenta capturar 'reason' dentro de un mensaje de error formateado en JSON
                        'Ha ocurrido un error'; // Usa un mensaje de error predeterminado si no se encuentra uno más específico
    return errorMessage; // Retorna el mensaje de error final
};

// Función para mostrar mensajes en la interfaz de usuario
const displayMessage = (elementId, text) => {
    // Obtiene el elemento por su ID para mostrar mensajes
    const message = document.getElementById(elementId); 

    // Establece el texto del mensaje en el elemento
     message.innerText = text;

    // Hace visible el elemento cambiando su estilo de visualización a 'block'
    message.style.display = 'block';

    // Llama a la función para ocultar el mensaje después de un retraso
    hideElementAfterDelay(elementId);
};

// Función para ocultar un elemento después de un retraso especificado
const hideElementAfterDelay = (elementId) => {
    setTimeout(() => {
        // Encuentra el elemento por su ID.
        const element = document.getElementById(elementId);
        
        // Oculta el elemento cambiando su estilo de visualización a 'none'
        element.style.display = 'none';

    }, 5000); // Establece un retraso de 5000 milisegundos (5 segundos) antes de ocultar el elemento
};

const candidateForm = document.querySelector("#candidateForm");

// Este evento se dispara cuando todo el contenido del DOM se ha cargado completamente
document.addEventListener("DOMContentLoaded", () => {
    App.initialize();  // Llama a la función de inicialización de la aplicación
});

// Manejador de eventos para el formulario de añadir candidato
candidateForm.addEventListener("submit", e => {
    e.preventDefault(); // Similarmente, previene la recarga de la página        
    const candidate = candidateForm["candidateName"].value; // Obtiene el nombre del candidato desde el formulario
    const id = candidateForm["candidateDetails"].value; // Obtiene la identificación del candidato desde el formulario
    App.createCandidate(id, candidate); // Llama a la función 'crearCandidato' en el objeto App, pasando los detalles necesarios
});


// Objeto principal que maneja la aplicación
App = {
    contracts: {}, // Almacena las instancias de los contratos desplegados

    // Inicializa la aplicación
    initialize: async () => {
        await App.loadEthereum(); // Carga y configura la conexión a Ethereum
        await App.loadAccount(); // Carga la cuenta del usuario
        await App.loadContracts(); // Carga el contrato inteligente
        await App.checkAndDisplayForm() // Muestra el formulario para añadir candidatos si es el creador del contrato
        await App.displayCandidate(); // Muestra los candidatos en la interfaz
        await App.displayWinner(); // Muestra el ganador actual en la interfaz
    },

    // Carga y configura la conexión a Ethereum
    loadEthereum: async () => {

        if (window.ethereum) {
            App.web3Provider = window.ethereum; // Utiliza ethereum si está disponible en el navegador
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' }); // Solicita acceso a las cuentas de Ethereum
                App.web3 = new Web3(App.web3Provider); // Crea una instancia de Web3 con el proveedor
                displayMessage('successfulMessages', "Conexión a Ethereum establecida correctamente.");
                // Escucha los cambios de cuenta
                window.ethereum.on('accountsChanged', App.handleAccountChange);
            } catch (error) {
                displayMessage('errorMessages', "Error al intentar conectar con MetaMask: " + error.message);
            }
            
        } else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
            App.web3 = new Web3(App.web3Provider);
            web3.eth.handleRevert = true;  // Habilita la gestión de reversiones para errores más descriptivos
            displayMessage('successfulMessages', "Proveedor web3 heredado detectado y conectado.");
        } else {
            displayMessage('errorMessages', "No hay ningún proveedor de Ethereum instalado. Intenta instalar MetaMask.");
        }
        
    },

    // Gestiona los cambios en las cuentas de Ethereum
    handleAccountChange: async (accounts) => {

        if (accounts.length === 0) {
            displayMessage('errorMessages', "Por favor, conecte una cuenta de MetaMask.");
        } else {
            window.location.reload();
        }
    },
    
    // Carga la cuenta del usuario conectada
    loadAccount: async () => {
        // Solicita acceso a las cuentas de Ethereum y almacena la primera cuenta encontrada
        const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        App.account = account; // Asigna la cuenta al estado de la aplicación
    },

    // Carga el contrato inteligente
    loadContracts: async () => {
        // Realiza una solicitud para obtener el JSON del contrato y convierte el resultado en un objeto JSON
        const BallotChainContractJSON = await fetch("BallotChain.json").then(res => res.json());

        // Inicializa el contrato con Truffle y establece el proveedor
        App.contracts.BallotChainContract = TruffleContract(BallotChainContractJSON);
        App.contracts.BallotChainContract.setProvider(App.web3Provider);

        // Obtiene la instancia desplegada del contrato
        App.BallotChainContract = await App.contracts.BallotChainContract.deployed();
    },

    // Función para verificar la cuenta y mostrar el formulario si coincide con el creador del contrato
    checkAndDisplayForm: async () => {
        const isOwner = await App.BallotChainContract.isOwner({ from: App.account });
        if (isOwner) {
            document.getElementById('candidateForm').style.display = 'block'; // Muestra el formulario
        } else {
            document.getElementById('candidateForm').style.display = 'none'; // Mantiene el formulario oculto si no es el creador
        }
    },

    // Función para manejar el evento de votación cuando el formulario es enviado
    handleVote: (e) => {
        // Previene la recarga de la página que es comportamiento predeterminado al enviar formularios
        e.preventDefault();
        
        try {
            // Obtiene el ID del candidato seleccionado y el ID del votante
            const selectedCandidateId = document.querySelector('input[name="candidate"]:checked').value;
            const voterId = document.getElementById('voterId').value;
            // Llama a la función de votación pasando los IDs necesarios
            if(voterId != '') {
                App.vote(voterId, selectedCandidateId);
            } else {
                displayMessage('errorMessages', "Debes seleccionar un candidato e introducir tu ID"); 
            }
            
        } catch {
            displayMessage('errorMessages', "Debes seleccionar un candidato e introducir tu ID"); 
        }


    },

    // Función para renderizar los candidatos en la interfaz de usuario
    displayCandidates: (candidatosConVotos) => {
        // Comprueba si hay candidatos disponibles
        if (candidatosConVotos.length === 0) {
            // Si no hay candidatos, muestra un mensaje indicativo
            document.querySelector('#candidatesList').innerHTML = 'No hay candidatos disponibles para votar.';
            return;
        }

        // Genera el HTML para cada candidato, incluyendo un radiobutton y la cantidad de votos
        const candidatesHtml = candidatosConVotos.map(({ nombre, id, votos }) => `
            <div class="candidate-item">
                <label>
                    <input type="radio" name="candidate" value="${id}">
                    ${nombre} - Votos actuales: ${votos}
                </label>
            </div>
        `).join('');

        // Establece el HTML en el elemento correspondiente e incluye el formulario de votación
        document.querySelector('#candidatesList').innerHTML = `
            <form id="voteForm">
                ${candidatesHtml}
                <div>
                    <input type="text" id="voterId" placeholder="Identificación del votante" class="form-control my-3" autofocus/>
                    <button class="btn btn-primary">Votar</button>
                </div>
            </form>
            <div id="messageDisplay"></div>
        `;

        // Agrega un manejador de evento al formulario de votación
        document.getElementById('voteForm').addEventListener('submit', App.handleVote);
    },
    
    // Función para obtener la lista de candidatos desde el contrato inteligente
    getCandidates: async () => {
        // Devuelve una la lista de candidatos
        return await App.BallotChainContract.getCandidates();
    },

    // Función para obtener los votos para cada candidato
    getCandidateVotes: async (candidatos) => {
        // Mapea cada candidato a sus votos y devuelve un objeto con esos datos
        const votesPromises = candidatos.map(([nombre, id]) =>
            App.BallotChainContract.getCandidateVotes(id).then(votos => {
                return { nombre, id, votos };
            })
        );
        
        return await Promise.all(votesPromises);
    },

    // Muestra los candidatos en la interfaz
    displayCandidate: async () => {
        // Obtener candidatos y luego sus votos antes de renderizarlos
        const candidatos = await App.getCandidates();
        const candidatosConVotos = await App.getCandidateVotes(candidatos);
        App.displayCandidates(candidatosConVotos);
    },

    // Muestra información del ganador en la interfaz
    displayWinner: async () => {
        // Llama al método determineWinner del contrato para obtener al ganador
        const ganador = await App.BallotChainContract.determineWinner();

        // Construye directamente el HTML para el ganador y lo asigna al elemento en el DOM
        const html = `
            <h6>${ganador}</h6>
        `;

        // Actualiza la interfaz con la información del ganador de forma más directa
        document.querySelector('#winnerDisplay').innerHTML = html;
    },

    // Función para crear un candidato
    createCandidate: async (identificacion, candidato) => {
        try {
            if(identificacion == '' | candidato == '') {
                displayMessage('errorMessages', "El candidato debe tener nombre e ID"); 
            } else {
                // Realiza la llamada al contrato para añadir un candidato
                await App.BallotChainContract.addCandidate(identificacion, candidato, {
                    from: App.account // Especifica quién realiza la llamada
                });

                displayMessage('successfulMessages', "El candidato ha sido creado con éxito");
                // Recargar la página para reflejar los cambios
                setTimeout(() => {
                    window.location.reload();
                }, 5000); // 5000 milisegundos = 5 segundos
            }
        } catch (e) {
            // Maneja los errores de la llamada al contrato
            displayMessage('errorMessages', extractErrorMessage(e));
        }
    },

    // Función para registrar un voto
    vote: async (idVotante, idCandidato) => {
        try {
            await App.BallotChainContract.vote(idVotante, idCandidato, { from: App.account });
            displayMessage('successfulMessages', "Voto realizado correctamente");
            window.setTimeout(() => window.location.reload(), 2000);  // Recarga después de 2 segundos
        } catch (e) {
            // Maneja los errores de la llamada al contrato
            displayMessage('errorMessages', extractErrorMessage(e)); 
        }
    },
}


