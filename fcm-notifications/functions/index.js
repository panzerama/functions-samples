/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

/**
 * Triggers when a user gets a new follower and sends a notification.
 *
 * Followers add a flag to `/followers/{followedUid}/{followerUid}`.
 * Users save their device notification tokens to `/users/{followedUid}/notificationTokens/{notificationToken}`.
 */
exports.sendFollowerNotification = functions.database.ref('/crisis/{crisisId}/').onWrite(event => {
  const crisisId = event.params.crisisId;
  //const team = event.params.team;
  // If un-follow we exit the function.
  if (!event.data.val()) {
    return console.log('Crisis ', crisisId, ' was removed');
  }

  // Get the values at team, crisisId, and crisisAddress. I need to write this as a promise thats fulfilled
  // before the get device tokens promise
  const getCrisisDataPromise = admin.database().ref(`/crisis/${crisisId}/`).once("value");

  return Promise.all([getCrisisDataPromise]).then(results => {
    const crisisDataSnapshot = results[0].val();

    var team = crisisDataSnapshot["team"];
    var crisisAddress = crisisDataSnapshot["crisisAddress"];
    console.log('We have a new crisis UID:', crisisId, ' for team:', team, ' at ', crisisAddress);


    // Get the list of device notification tokens.
    const getDeviceTokensPromise = admin.database().ref(`/teams/${team}/teamMembers/0/notificationToken/`).once('value');

    return Promise.all([getDeviceTokensPromise]).then(results =>  {//the purpose here is to make sure both gets are fulfilled before moving on
      const token = "fvIzSfQxfJI:APA91bF7JmtjcKon_xLUUEV4Hbb3D_ABqpsqYpEIMd3pnz12oSqQnrAPuPLenNCUirkhQaZ5DB85FYUIEZ_y0qOVdsUtcZO48_fFpxjIl5tnAmkpJ6w-IeTnqRW5yqZ0Dr3bxo9f_d1Q";//results[0].val();

      // Check if there are any device tokens.

      console.log('The token is', token);

      // Notification details.
      const payload = {
        data: {
          crisisId: crisisId,
          crisisAddress: crisisAddress
        }
      };


      // Send notifications to all tokens.
      return admin.messaging().sendToDevice(token, payload).then(response => {
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.error('Failure sending notification to', tokens[index], error);
            // Cleanup the tokens who are not registered anymore.
          }
        });
      });
      });
  });
});
