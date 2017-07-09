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
        document.getElementById("playArea").style.visibility = enable ? "visible" : "hidden";
    }
    else {
        frmGamePlay.style.visibility = enable ? "visible" : "hidden";
    }
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
      console.log("User logged out successfully.");
  }
  catch (e) {
      console.log(e.message);
  }
};

auth.onAuthStateChanged(authStateChangedHandle);

function authStateChangedHandle() {
    currentUser = auth.currentUser;
    if (currentUser) {
        console.log("User logged in successfully.");
        console.log(currentUser);
        frmGameHosting.style.visibility = "visible";
        modifyForm(frmUser, true);
    }
    else {
        console.log("No user logged in.");
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

// var dbGamePassword; // optional // not really optional but not priority! TODO: password
// var dbGameHostUserId; // now refactored into the array of players
/* gameId is a string of input mask: [\"A\"0000] if in game or 0 if not,
example: A5549, note the character is always A, is meaningless and hidden from user.
dbGameId is the connection to the database that links to this gameId */
var gameId; // see multiline comment above
var dbGameId; // see multiline comment above
var gameStatus; // is string that's either joinable or unJoianble // TODO: have another variable for kick out?
var gameJudgeStatus; // is string that's either judgeWaiting or judgePlaying
var gamePlayersJoined = []; // is an array of all the users!
var gamePlayersJoinedCount; // is an integer of the number of players joined
var amHost = true; // true or false depending on which radio button is selected
var isDbEventListenersActive = false; // is set to true if enableDbEventListeners() exited successfully and prevents multiple eventListeners

var frmGameHosting = document.getElementById("frmGameHosting");
var rdoCreate = document.getElementById("rdoCreate");
var rdoJoin = document.getElementById("rdoJoin");
var txtGameId = document.getElementById("txtGameId");
var btnGameSubmit = document.getElementById("btnGameSubmit");
var btnGameExit = document.getElementById("btnGameExit");
var btnGameStart = document.getElementById("btnGameStart");

var frmGamePlay = document.getElementById("frmGamePlay");
var rdoGamePlayFirst = document.getElementById("rdoGamePlayFirst");
var rdoGamePlaySecond = document.getElementById("rdoGamePlaySecond");
var rdoGamePlayThird = document.getElementById("rdoGamePlayThird");

rdoCreate.onclick = function () {
    txtGameId.readOnly = true;
    txtGameId.placeholder = "ID will be generated.";
    amHost = true;
};

rdoJoin.onclick = function () {
    txtGameId.readOnly = false;
    txtGameId.placeholder = "Enter game ID here...";
    amHost = false;
};

btnGameSubmit.onclick = btnGameSubmitClickedHandle;

frmGameHosting.onkeyup = function (event) {
    if (event.keyCode === 13) {
        btnGameSubmitClickedHandle();
    }
};

function btnGameSubmitClickedHandle() { // TODO: should have username option too and identify users with this instead of userEmail?
    if (rdoCreate.checked === true) {
        txtGameId.value = Math.floor(Math.random() * 9000 + 1000);
        gameId = "A" + txtGameId.value.toString();
        dbGameId = db.ref().child(gameId);
        dbGameId.set({
            gameStatus: "joinable",
                gamePlayersJoinedCount: 1,
                gamePlayersJoined: {
                    host: {
                        userEmail: currentUser.email
                    }
                }
        });
        enableDbEventListeners();
        modifyForm(frmGameHosting, true);
    }
    else {
        gameId = "A" + txtGameId.value.toString();
        dbGameId = db.ref(gameId);
        dbGameId.once("value", function (snapshot) {
            try {
                gameStatus = snapshot.val().gameStatus;
                if (gameStatus === "unJoinable") {
                    throw {
                        name: "unJoianble Game",
                        message: "You may not join an unJoinable game."
                    }
                }
                dbGameId.child("gamePlayersJoined").push().set({
                    userEmail: currentUser.email
                    // TODO: should have another value here: playing/notPlaying?, means numChildren() won't  work (from host)
                });
                // dbPlayersJoinedCount = snapshot.val().gamePlayersJoinedCount; // TODO: what is the point of reading this value? to know when a user enters or exits
                // dbPlayersJoined = snapshot.val().gamePlayersJoined; // TODO: have a chat system based on this?
                enableDbEventListeners();
                modifyForm(frmGameHosting, true); // this requires enableDbEventListeners to be called first, do not move outside!
            }
            catch (e) {
                console.log(e.message);
            }
        });
    }
    // TODO: start game
    // TODO: have chat system enabled when user is signed in, global chat system
    return false;
};

btnGameExit.onclick = function btnGameExitClickedHandle() {
    if (confirm("Are you sure you want to leave the game?" +
        (amHost === true ? "\nThe game will no longer exist and all players will be kicked out." : "")) === true) {
        if (amHost === true) {
            dbGameId.set({ // TODO: should remove game? or change status?
                gameStatus: "unJoinable"
            });
        }
        else {
            try {
                dbGameId.child("gamePlayersJoined").once("value", function (snapshot) {
                    snapshot.forEach(function (item) {
                        if (item.val().userEmail === currentUser.email) {
                            item.V.remove(); // TODO: should remove oneself or set as inactive?
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
    }
};

function enableDbEventListeners() {
    if (isDbEventListenersActive === true) {
        return;
    }
    dbGameId.on("value", function (snapshot) {
        try {
            if (snapshot.val().gameStatus === "unJoinable") {
                throw {
                    name: "unJoianble Game",
                    message: "You may not join an unJoinable game."
                }
            }
            if (amHost === true) {
                dbGameId.update({
                    gamePlayersJoinedCount: snapshot.child("gamePlayersJoined").numChildren()
                });
            }
            gameStatus = snapshot.val().gameStatus;
            gamePlayersJoinedCount = snapshot.val().playersJoinedCount;
            gamePlayersJoined.length = 0;
            gamePlayersJoined = Object.keys(snapshot.val().gamePlayersJoined).map(function (val) {
                return snapshot.val().gamePlayersJoined[val].userEmail;
            });
            isDbEventListenersActive = true;
        }
        catch (e) {
            console.log(e.message);
        }
    });
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
