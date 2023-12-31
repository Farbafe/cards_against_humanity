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
    frmGamePlay.style.visibility = enable ? "visible" : "hidden";
}

function modifyForm(form, disable) {
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
    if (frmUser.checkValidity() === true) {
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
    if (isEmailValid() === false) {
        return;
    }
    if (isPasswordValid() === false) {
        return;
    }
    try {
        authPromise = auth.signInWithEmailAndPassword(txtEmail.value, txtPassword.value);
    }
    catch (e) {
        console.log(e.message);
    }
}

btnSignUp.onclick = function btnSignUpClickedHandle() {
    if (isEmailValid() === false) {
        return;
    }
    if (isPasswordValid() === false) {
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
var gamePlayersJoined = [];
var amHost = true;
var judgeCounter = 0;
var amJudge = null;
var amPickWinner;
var isDbEventListenersActive = false; // is set to true if enableDbEventListeners() exited successfully and prevents multiple eventListeners

var dbWhiteCards = db.ref("cards/white");
var dbBlackCards = db.ref("cards/black");
var dbPlayersJoinedCount;
var dbPlay; // = db.ref("play/" + gameId + "/" + currentUser.userEmail + "/"); // TODO: this db.ref should not be exposed to user?
// TODO: how to avoid user increasing their own score?
// How about have 2 database location for user points
// 1 is read and write, hidden to user, accessible by server side function
// the other is read only, read by user, duplicates itself to the hidden value

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
var gameCardContainerBlack = document.getElementById("gameCardContainerBlack");

var isJudgeUpdated = false;

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

function createUniqueGame() {
    dbGameId = db.ref('games/' + gameId);
    dbGameId.set({
        isGameJoinable: true,
        isJudgeWaiting: false,
        gamePassword: txtGamePassword.value.toString()
    });
    modifyForm(frmGameHosting, true);
}

btnGameSubmit.onclick = btnGameSubmitClickedHandle;

frmGameHosting.onkeyup = function (event) {
    if (event.keyCode === 13) {
        btnGameSubmitClickedHandle();
    }
};

function btnGameSubmitClickedHandle() {
    if (txtGameId.readOnly === true) {
        db.ref("games/").once("value", function (snapshot) {
            var arrayIterator;
            for (arrayIterator = 1000; arrayIterator < 9999; ++arrayIterator) {
                if (snapshot.hasChild("A" + arrayIterator) !== true) {
                    txtGameId.value = arrayIterator;
                    gameId = "A" + arrayIterator;
                    db.ref('play/' + gameId + '/points').child(normalEmailToDbEmail(currentUser.email)).set(0);
                    createUniqueGame();
                    break; // TODO: this thing can have multiple games if people click at the same time!!!!
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
            if (snapshot.exists() === false) {
                console.log("No game with this ID exists!");
                return;
            }
            isGameJoinable = snapshot.val().isGameJoinable;
            if (isGameJoinable === false) {
                console.log("You may not join an unJoinable game.");
                return;
            }
            if (txtGamePassword.value.toString() !== snapshot.val().gamePassword) { // TODO: users can read pass value
                console.log("The password you have entered is not correct.");
                return;
            }
            enableDbEventListeners();
            modifyForm(frmGameHosting, true);
        });
    }
    db.ref('play/' + gameId + '/points').child(normalEmailToDbEmail(currentUser.email)).set(0);
    // TODO: have chat system enabled when user is signed in, global and local chat system
}

btnGameExit.onclick = function btnGameExitClickedHandle() {
    if (confirm("Are you sure you want to leave the game?" +
            (amHost === true ? "\nThe game will no longer exist and all players will be kicked out." : "")) === true) {
        if (amHost === true) {
            dbGameId.set({ // TODO: should remove game? or change status?
                isGameJoinable: false // this method deletes all other fields too!
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
        modifyForm(frmGameHosting, false);
        disableDbEventListeners();
    }
};

function dbEmailToNormalEmail(dbEmailInput) {
    return dbEmailInput.replace("__PERIOD__", ".");
}

function normalEmailToDbEmail(normalEmailInput) {
    return normalEmailInput.replace(".", "__PERIOD__");
}

function enableDbEventListeners() {
    if (isDbEventListenersActive === true) {
        return;
    }
    dbPlay = db.ref("play/" + gameId);
    dbPlay.child("points").on("value", function (snapshot) {
        updatePlayers();
    });
    dbPlay.child("winner").on("value", function (snapshot) {
        dbGameId.child("isGameJoinable").set(true);
        listOfCardsItemButton = document.createElement("button");
        snapshot.forEach(function (item) {
            listOfCards = document.createElement("ul");
            listOfCards.style.listStyleType = "none";
            listOfCardsItem = document.createElement("li");
            listOfCardsItemButton.innerHTML = item.val();
            if (listOfCardsItemButton.length > 60) {
                listOfCardsItemButton.style.fontSize = "0.7em"; // TODO: have a more rigorous length test!
            }
            listOfCardsItemButton.classList.add("btn");
            gameCardContainer.appendChild(document.createElement("br"));
            gameCardContainer.appendChild(document.createTextNode("The winning card is:"));
            gameCardContainer.appendChild(document.createElement("br"));
            listOfCardsItem.appendChild(listOfCardsItemButton);
            listOfCardsItem.classList.add("list-spacing");
            listOfCards.appendChild(listOfCardsItem);
            gameCardContainer.appendChild(listOfCards);
            gameCardContainer.appendChild(document.createElement("br"));
            gameCardContainer.appendChild(document.createTextNode("The winning player is:"));
            gameCardContainer.appendChild(document.createElement("br"));
            gameCardContainer.appendChild(document.createTextNode(dbEmailToNormalEmail(item.key)));
        });
    });
    dbGameId.child("judge").on("value", function (snapshot) {
        amJudge = snapshot.val() === currentUser.email;
        isJudgeUpdated = true;
        dbGameId.child("isJudgeWaiting").once("value", function (snap) {
            console.log("isJdgeWaiting: " + snap.val());
            isJudgeWaiting = snap.val();
        }).then(startNewRound);
    });
    dbGameId.child("isGameJoinable").on("value", function (snapshot) {
        isGameJoinable = snapshot.val();
    });
    dbGameId.child("isJudgeWaiting").on("value", function (snapshot) {
        isJudgeWaiting = snapshot.val();
    });
    isDbEventListenersActive = true;

}

function disableDbEventListeners() {
    dbGameId.off(); // TODO: remove the list of players and cards first. .off() works, .off("value") works, .off("value", callback) works
    dbPlay.off();
    isDbEventListenersActive = false;
}

function Player(email, points) {
    this.email = email;
    this.points = points;
}

function getPlayer(Player) {
    return Player.email + ": " + (Player.points === undefined ? "0" : Player.points);
}

function updatePlayers() {
    gamePlayersJoined = [];
    dbPlay.child("points").once("value", function (snapshot) {
        snapshot.forEach(function (item) {
            gamePlayersJoined.push(new Player(dbEmailToNormalEmail(item.key), item.val()));
        });
    updatePlayersDom();
    });
}

function updatePlayersDom() {
    var listOfPlayers = document.createElement('ul');
    var listOfPlayersItem;
    gamePlayersJoined.forEach(function (player) {
        listOfPlayersItem = document.createElement('li');
        listOfPlayersItem.appendChild(document.createTextNode(getPlayer(player)));
        listOfPlayers.appendChild(listOfPlayersItem);
    });
    footer.textContent = "";
    footer.appendChild(listOfPlayers);
}

btnGameStart.onclick = function () { // TODO: join at any time, play next round?!
    dbGameId.child("isGameJoinable").set(false);
    enableDbEventListeners();
    initiateNewRound();
};

function initiateNewRound() {
    var interval = setInterval(initiateNewRoundRepeatedly, 500);
    function initiateNewRoundRepeatedly() {
        dbPlay.update({
            blackCard: null,
            whiteCards: null,
            winner: null
        });
        amPickWinner = false;
        judgeCounter = ++judgeCounter % gamePlayersJoined.length;
        dbGameId.child("judge").set(gamePlayersJoined[judgeCounter].email);
        clearInterval(interval);
    }
}

function startNewRound() {
    if (isJudgeUpdated === true) {
        gameCardContainerBlack.innerHTML = "";
        gameCardContainer.innerHTML = "";
        isJudgeUpdated = false;
        (amJudge === true && isJudgeWaiting === false) || (amJudge === false && isJudgeWaiting === true )
            ? makeListOfCards() : playerWait();
    }
}

function listOfCardsItemButtonClickedHandle() {
    this.classList.add("btn-active");
    [].forEach.call(listOfCards.childNodes, function(child) {
        child.firstChild.disabled = true;
    });
    if (amJudge === true && amPickWinner === true) {
        dbGameId.child("isJudgeWaiting").set(false);
        amPickWinner = false;
        amJudge = false;
        var thisInnerHtml = this.innerHTML;
        dbPlay.child("whiteCards").once("value", function (snapshot) {
            snapshot.forEach(function (item) {
                if (item.val() === thisInnerHtml) {
                    var userWinner = item.key;
                    dbPlay.child("winner/" + userWinner).set(thisInnerHtml);
                    dbPlay.child("points/" + userWinner).once("value", function (snap) {
                        var snapIncrement = snap.val() + 1;
                        dbPlay.child("points/" + userWinner).set(snapIncrement);
                    });
                }
            });
        });
    }
    else if (amJudge === true) {
        dbGameId.child("isJudgeWaiting").set(true);
        gameCardContainerBlack.innerHTML = "Black card is:<br>" + this.innerHTML;
        dbPlay.child("blackCard").set(this.innerHTML);
        playerWait();
    }
    else {
        dbPlay.child("whiteCards/" + normalEmailToDbEmail(currentUser.email)).set(this.innerHTML);
    }
}

var listOfCards;
var listOfCardsItem;
var listOfCardsItemButton;

function makeListOfCards() {
    var arrayIterator = 0;
    var currentNumber = 0;
    var randomNumber = [];
    for (; arrayIterator < 3; ++arrayIterator) {
        // blackCardCount, whiteCardCount = 345, 1259
        randomNumber.push(Math.floor(Math.random() * (amJudge === true ? 345 : 1259))); // TODO: make sure there are no duplicates! use server side
    }
    if (amJudge === true) {
        dbBlackCards.once("value", function (snapshot) {
            listOfCards = document.createElement("ul");
            listOfCards.style.listStyleType = "none";
            snapshot.forEach(function (item) { // this and the function below r identical, please join, maybe even another identical set!
                for (arrayIterator = 0; arrayIterator < 3; ++arrayIterator) {
                    if (currentNumber === randomNumber[arrayIterator]) {
                        listOfCardsItem = document.createElement("li");
                        listOfCardsItemButton = document.createElement("button");
                        listOfCardsItemButton.innerHTML = item.val();
                        if (item.val().toString().length > 60) {
                            listOfCardsItemButton.style.fontSize = "0.7em"; // TODO: have a more rigorous length test!
                        }
                        listOfCardsItemButton.classList.add("btn");
                        listOfCardsItemButton.onclick = listOfCardsItemButtonClickedHandle;
                        listOfCardsItem.appendChild(listOfCardsItemButton);
                        listOfCardsItem.classList.add("list-spacing");
                        listOfCards.appendChild(listOfCardsItem);
                    }
                }
                ++currentNumber;
            });
            gameCardContainer.innerHTML = "";
            gameCardContainer.appendChild(listOfCards);
        });
    }
    else {
        dbWhiteCards.once("value", function (snapshot) {
            listOfCards = document.createElement("ul");
            listOfCards.style.listStyleType = "none";
            snapshot.forEach(function (item) {
                for (arrayIterator = 0; arrayIterator < 3; ++arrayIterator) {
                    if (currentNumber === randomNumber[arrayIterator]) {
                        listOfCardsItem = document.createElement("li");
                        listOfCardsItemButton = document.createElement("button");
                        listOfCardsItemButton.innerHTML = item.val();
                        if (item.val().toString.length > 60) {
                            listOfCardsItemButton.style.fontSize = "0.7em"; // TODO: have a more rigorous length test!
                        }
                        listOfCardsItemButton.classList.add("btn");
                        listOfCardsItemButton.onclick = listOfCardsItemButtonClickedHandle;
                        listOfCardsItem.appendChild(listOfCardsItemButton);
                        listOfCardsItem.classList.add("list-spacing");
                        listOfCards.appendChild(listOfCardsItem);
                    }
                }
                ++currentNumber;
            });
            gameCardContainer.innerHTML = "";
            gameCardContainer.appendChild(listOfCards);
        });
    }
}

function playerWait() {
    gameCardContainer.innerHTML = "Wait for your turn to play.";
    if (amJudge === true) {
        var dbPlayWhiteCardsCallback = dbPlay.child("whiteCards").on("value", function (snapshot) {
            if (snapshot.numChildren() === gamePlayersJoined.length - 1) {
                dbGameId.child("isJudgeWaiting").set(false);
                listOfCards = document.createElement("ul");
                listOfCards.style.listStyleType = "none";
                snapshot.forEach(function (item) {
                    listOfCardsItem = document.createElement("li");
                    listOfCardsItemButton = document.createElement("button");
                    listOfCardsItemButton.innerHTML = item.val();
                    if (item.val().toString().length > 60) {
                        listOfCardsItemButton.style.fontSize = "0.7em"; // TODO: have a more rigorous length test!
                    }
                    listOfCardsItemButton.classList.add("btn");
                    listOfCardsItemButton.onclick = listOfCardsItemButtonClickedHandle;
                    listOfCardsItem.appendChild(listOfCardsItemButton);
                    listOfCardsItem.classList.add("list-spacing");
                    listOfCards.appendChild(listOfCardsItem);
                });
                amPickWinner = true;
                gameCardContainer.innerHTML = "";
                gameCardContainer.appendChild(listOfCards);
                dbPlay.child("whiteCards").off("value", dbPlayWhiteCardsCallback);
            }
        });
    }
    else {
        var dbPlayBlackCardCallback = dbPlay.child("blackCard").on("value", function (snapshot) {
            if (snapshot.exists() === false) {
                console.log("Black Card not played yet.");
                return;
            }
            if (amJudge === true) {
                return;
            }
            gameCardContainerBlack.innerHTML = "Black card is:<br>" + snapshot.val(); // TODO: show as black card
            makeListOfCards();
            dbPlay.off("value", dbPlayBlackCardCallback);
        });
    }
}

// Parser to parse cards and send them to web.
// document.getElementById('file').onchange = function(){
//     var file = this.files[0];
//     var reader = new FileReader();
//     reader.onload = function(progressEvent) {
//         var lines = this.result.split('\r\n');
//         var linesLength = lines.length - 1;
//         var line;
//         for(line = 0; line < linesLength; ++line){
//             if (lines[line].slice(-1) !== "?" || lines[line].slice(-1) !== ".") {
//                 lines[line] += ".";
//             }
//             db.ref("blackCards").push().set(lines[line]);
//         }
//     };
//     reader.readAsText(file);
// };
// End Parser

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

// TODO: improve ui and user flow --> tooltips
// TODO: make black and white cards ui
// TODO: remove debugging
// TODO: set timeouts if server doesnt respond in 3 seconds, show message and then keep trying for more
