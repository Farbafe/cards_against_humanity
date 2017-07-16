/**
 * Created by Yehya on 24/06/2017.
 */

// Begin Firebase initialisation
var config = {
    apiKey: "AIzaSyBsNEie1prDfEVvperc4EPptN8s9yjMX7I",
    authDomain: "unotest-ace36.firebaseapp.com",
    databaseURL: "https://unotest-ace36.firebaseio.com",
    projectId: "unotest-ace36",
    storageBucket: "unotest-ace36.appspot.com",
    messagingSenderId: "23518094838"
};
firebase.initializeApp(config);
// End Firebase initialisation

// Begin HTML file manipulation
function modifyFrmUser(enable) {
    if (currentUser) {
        txtEmail.value = currentUser.email;
    }
    if (enable === undefined) {
        enable = true;
    }
    txtPassword.value = "";
    btnLogout.style.visibility = enable ? "visible" : "hidden";
    btnLogout.disabled = !enable;
    modifyForm(frmGameHosting, false);
}

function modifyFrmGameHosting(enable) {
    if (enable === undefined) {
        enable = true;
    }
    btnGameExit.style.visibility = enable ? "visible" : "hidden";
    btnGameExit.disabled = !enable;
    if (amHost === true) {
        btnGameStart.style.visibility = enable ? "visible" : "hidden";
        btnGameStart.disabled = !enable;
        lblGameStart.style.visibility = enable ? "visible" : "hidden";
        lblGameStart.disabled = !enable;
    }
    frmGamePlay.style.visibility = enable ? "visible" : "hidden"; // TODO: judge should get black cards, players should get white card!
}

function modifyForm(form, disable) {
    if (form === undefined) {
        console.log("modifyForm called without mandatory parameter \"form\"");
        return;
    }
    if (disable === undefined) {
        disable = true;
    }
    var formElements = form.elements;
    var formElementsIterator = 0;
    var formElementsLength = formElements.length;
    for (; formElementsIterator < formElementsLength; ++formElementsIterator) {
        formElements[formElementsIterator].disabled = disable;
    }
    if (form === frmUser) {
        modifyFrmUser(disable);
    }
    else if (form === frmGameHosting) {
        modifyFrmGameHosting(disable);
    }
}
// End HTML file manipulation

// Begin Firebase Authentication
var auth = firebase.auth();
var currentUser;
var authPromise;

var frmUser = document.getElementById("frmUser");
var txtEmail = document.getElementById("txtEmail");
var txtPassword = document.getElementById("txtPassword");
var btnLogin = document.getElementById("btnLogin");
var btnSignUp = document.getElementById("btnSignUp");
var btnLogout = document.getElementById("btnLogout");

function isEmailValid() {
    if (frmUser.checkValidity()) {
        return true;
    }
    else {
        console.log("Email is badly formatted.");
        return false;
    }
}

function isPasswordValid() {
    if (txtPassword.value.length >= 6) {
        return true;
    }
    else {
        console.log("Password must be 6 characters long or more.");
        return false;
    }
}

btnLogin.onclick = btnLoginClickedHandle;

frmUser.onkeyup = function (event) {
    if (event.keyCode === 13) {
        btnLoginClickedHandle();
    }
};

function btnLoginClickedHandle() {
    if (!isEmailValid()) {
        return;
    }
    if (!isPasswordValid()) {
        return;
    }
    try {
        authPromise = auth.signInWithEmailAndPassword(txtEmail.value, txtPassword.value);
    }
    catch (e) {
        console.log(e.message);
    }
};

btnSignUp.onclick = function btnSignUpClickedHandle() {
    if (!isEmailValid()) {
        return;
    }
    if (!isPasswordValid()) {
        return;
    }
    try {
        authPromise = auth.createUserWithEmailAndPassword(txtEmail.value, txtPassword.value);
    }
    catch (e) {
        console.log(e.message);
    }
};

btnLogout.onclick = function btnLogoutClickedHandle() {
    try {
        auth.signOut();
    }
    catch (e) {
        console.log(e.message);
    }
};

auth.onAuthStateChanged(authStateChangedHandle);

function authStateChangedHandle() {
    currentUser = auth.currentUser;
    if (currentUser) {
        frmGameHosting.style.visibility = "visible";
        modifyForm(frmUser, true);
    }
    else {
        frmGameHosting.style.visibility = "hidden";
        modifyForm(frmUser, false);
    }
}

/* Different approach to authStateChangedHandle below
 // newer method
 // worse readability and not reusable code
 //auth.onAuthStateChanged(firebaseUser => {
 //    if (firebaseUser) {
 //    console.log(firebaseUser);
 //}
 //else {
 //    console.log("No user logged in.");
 //}
 //});
 */

// End Firebase Authentication

// Begin Firebase Database
var db = firebase.database();

/* gameId is a string of input mask: [\"A\"0000], minimum value is 1000
 example: A5549, note the character is always A, is meaningless and hidden from user.
 dbGameId is the connection to the database that links to this gameId */
var gameId; // see multiline comment above
var dbGameId; // see multiline comment above
var isGameJoinable;
var isJudgeWaiting;
var gamePlayersJoined = []; // is an array of all the users!
var gamePlayersJoinedCount; // is an integer of the number of players joined
var amHost = true; // TODO: is this useful? not as of right now
var isDbEventListenersActive = false; // is set to true if enableDbEventListeners() exited successfully and prevents multiple eventListeners

var frmGameHosting = document.getElementById("frmGameHosting");
var btnCreate = document.getElementById("btnCreate");
var btnJoin = document.getElementById("btnJoin");
var txtGameId = document.getElementById("txtGameId");
var txtGamePassword = document.getElementById("txtGamePassword");
var btnGameSubmit = document.getElementById("btnGameSubmit");
var btnGameExit = document.getElementById("btnGameExit");
var btnGameStart = document.getElementById("btnGameStart");
var lblGameStart = document.getElementById("lblGameStart");

var frmGamePlay = document.getElementById("frmGamePlay");

var footer = document.getElementById("footer");
var gameCardContainer = document.getElementById("gameCardContainer");

btnCreate.onclick = function () {
    txtGameId.readOnly = true;
    txtGameId.placeholder = "Game ID will be generated.";
    amHost = true;
    btnCreate.classList.add("btn-active");
    btnJoin.classList.remove("btn-active");
};

btnJoin.onclick = function () {
    txtGameId.readOnly = false;
    txtGameId.placeholder = "Enter game ID here.";
    amHost = false;
    btnJoin.classList.add("btn-active");
    btnCreate.classList.remove("btn-active");
};

btnGameSubmit.onclick = btnGameSubmitClickedHandle;

frmGameHosting.onkeyup = function (event) {
    if (event.keyCode === 13) {
        btnGameSubmitClickedHandle();
    }
};

function startUniqueGame() {
    dbGameId = db.ref('games/' + gameId);
    dbGameId.set({
        isGameJoinable: true,
        isJudgeWaiting: true,
        gamePassword: txtGamePassword.value.toString(),
        gamePlayersJoined: {
            host: {
                userEmail: currentUser.email
            }
        }
    });
    enableDbEventListeners();
    modifyForm(frmGameHosting, true);
}

function btnGameSubmitClickedHandle() {
    if (txtGameId.readOnly === true) {
        db.ref("games/").once("value", function (snapshot) {
            var arrayIterator;
            for (arrayIterator = 1000; arrayIterator < 9999; ++arrayIterator) {
                if (snapshot.hasChild("A" + arrayIterator) !== true) {
                    txtGameId.value = arrayIterator;
                    gameId = "A" + arrayIterator;
                    startUniqueGame();
                    break;
                }
            }
        });
        // TODO: use REST API with parameter shallow to avoid downloading children
        // TODO: for now avoid using startat and limittofirst
    }
    else {
        gameId = "A" + txtGameId.value.toString();
        dbGameId = db.ref('games/' + gameId);
        dbGameId.once("value", function (snapshot) {
            if (snapshot.val() === null) {
                console.log("No game with this ID exists!");
                return;
            }
            isGameJoinable = snapshot.val().isGameJoinable;
            if (isGameJoinable === false) {
                console.log("You may not join an unJoinable game.");
                return;
            }
            if (txtGamePassword.value.toString() !== snapshot.val().gamePassword) {
                console.log("The password you have entered is not correct.");
                return;
            }
            dbGameId.child("gamePlayersJoined").push().set({
                userEmail: currentUser.email
                // TODO: should have another value here: playing/notPlaying?, means numChildren() won't  work (from host) // can it help with letting users butt in mid game?
            });
            enableDbEventListeners();
            modifyForm(frmGameHosting, true);
        });
    }
    // TODO: start game
    // TODO: have chat system enabled when user is signed in, global and local chat system
}

btnGameExit.onclick = function btnGameExitClickedHandle() {
    if (confirm("Are you sure you want to leave the game?" +
            (amHost === true ? "\nThe game will no longer exist and all players will be kicked out." : "")) === true) {
        if (amHost === true) {
            dbGameId.set({ // TODO: should remove game? or change status?
                isGameJoinable: false
            });
        }
        else {
            try {
                dbGameId.child("gamePlayersJoined").once("value", function (snapshot) {
                    snapshot.forEach(function (item) {
                        if (item.val().userEmail === currentUser.email) {
                            item.V.remove(); // TODO: should remove oneself or set as inactive? // TODO: should remove all or just one?
                        }
                    });
                });
            }
            catch (e) {
                console.log(e.message);
            }
        }
        // TODO: exit game
        modifyForm(frmGameHosting, false);
        disableDbEventListeners();
    }
};

function enableDbEventListeners() {
    if (isDbEventListenersActive === true) {
        return;
    }
    dbGameId.on("value", function dbGameIdValueHandle(snapshot) {
        isJudgeWaiting = snapshot.val().isJudgeWaiting;
        isGameJoinable = snapshot.val().isGameJoinable;
        gamePlayersJoined.length = 0;
        gamePlayersJoined = Object.keys(snapshot.val().gamePlayersJoined).map(function (val) {
            return snapshot.val().gamePlayersJoined[val].userEmail;
        });
    });
    db.ref("playersJoinedCount/" + gameId).on("value", function (snap) {
        if (!snap.val()) {
            return;
        }
        gamePlayersJoinedCount = snap.val();
        makeListOfPlayers();
    });
    isDbEventListenersActive = true;
}

function disableDbEventListeners() {
    dbGameId.off(); // TODO: remove the lsit of plaeyrs and cards first
    db.ref("playersJoinedCount/" + gameId).off(); // .off() works, .off("value") works, .off("value", callback) works
    isDbEventListenersActive = false;
}

btnGameStart.onclick = function () {
    dbGameId.update({
        isGameJoinable: false
    });
};

function makeListOfPlayers() {
    if (gamePlayersJoinedCount !== gamePlayersJoined.length) {
        console.log("Data mismatch: gamePlayersJoined !== gamePlayersJoined.length");
        return;
    }
    var listOfPlayers = document.createElement('ul');
    var listOfPlayersItem;
    var arrayIterator = 0;
    for (; arrayIterator < gamePlayersJoinedCount; ++arrayIterator) {
        listOfPlayersItem = document.createElement('li');
        listOfPlayersItem.appendChild(document.createTextNode(gamePlayersJoined[arrayIterator]));
        listOfPlayers.appendChild(listOfPlayersItem);
    }
    footer.innerHTML = "";
    footer.appendChild(listOfPlayers);
    makeListOfCards();
}

var dbWhiteCards = db.ref("cards/white");
var dbPlayersJoinedCount;
var dbPlay; // = db.ref("play/" + gameId + "/" + currentUser.userEmail + "/"); // TODO: this db.ref should not be exposed to user?

function listOfCardsItemButtonClickedHandle() {
    console.log(this.innerHTML); // TODO: send this to play/gameId/user/response and there's another field that has the
    // amount of points play/gameId/user/points

    this.classList.add("btn-active");
    [].forEach.call(listOfCards.childNodes, function(child) {
        child.firstChild.disabled = true;
    });
}

var listOfCards = document.createElement("ul");
listOfCards.style.listStyleType = "none";

function makeListOfCards() {
    listOfCards.innerHTML = "";
    var listOfCardsItem;
    var listOfCardsItemButton;
    var arrayIterator = 0;
    var currentNumber = 0;
    var randomNumber = [];
    for (; arrayIterator < 3; ++arrayIterator) {
        randomNumber.push(Math.floor(Math.random() * 1259)); // TODO: make sure there are no duplicates!
    }
    dbWhiteCards.once("value", function (snapshot) {
        snapshot.forEach(function (item) {
            for (arrayIterator = 0; arrayIterator < 3; ++arrayIterator) {
                if (currentNumber === randomNumber[arrayIterator]) {
                    listOfCardsItem = document.createElement("li");
                    listOfCardsItemButton = document.createElement("button");
                    listOfCardsItemButton.innerHTML = item.val();
                    listOfCardsItemButton.classList.add("btn");
                    listOfCardsItemButton.onclick = listOfCardsItemButtonClickedHandle;
                    listOfCardsItem.appendChild(listOfCardsItemButton);
                    listOfCardsItem.classList.add("list-spacing");
                    listOfCards.appendChild(listOfCardsItem);
                }
            }
            ++currentNumber;
        })
    });
    gameCardContainer.innerHTML = "";
    gameCardContainer.appendChild(listOfCards);
}

/* Code Examples
 // dbGameStatus.on("value", snap => {
 //     dbUserCount = snap.val().userCount;
 //     dbGameHostId = snap.val().hostId;
 // });

 // dbPlayersJoined.on("value", function(snap) {
 //     snap.forEach(function(item) {
 //         if (item.val() === "yehya") {
 //             console.log(item.val());
 //         }
 //     })
 // });
 */

// End Firebase Database
