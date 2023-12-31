const functions = require('firebase-functions');

exports.playersJoinedCountWriteHandle = functions.database.ref('/games/{gameId}')
    .onWrite(event => {
    return event.data.child("isGameJoinable").val() === true ? event.data.ref.parent.parent.child('playersJoinedCount/' + event.params.gameId).set(event.data.child('gamePlayersJoined').numChildren()) : 0;
    // TODO: UNSURE! replace false ternary operator with: event.data.ref.parent.parent.child('playersJoinedCount/' + event.params.gameId).set(0)
});

// This is now done client-wise due to Google's Firebase's change in API!
