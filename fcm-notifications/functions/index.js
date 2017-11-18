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
exports.sendCrisisNotification = functions.database.ref('/crisis/').onWrite(event => {
  //const crisisId = "000001";
  //const team = event.params.team;

  //event.data.val() will contain all of the crises. I need to find the one that hasn't
  //been responded to.

  var crisis_table_values = event.data.val();

  console.log("crisis_table_values ", crisis_table_values);
  //console.log("crisis_table_values by crisis id", crisis_table_values[crisisId]);

  for (var key in crisis_table_values){
      if (crisis_table_values[key]["status"] && crisis_table_values[key]["status"] == "open"){
        var team = crisis_table_values[key]["teamName"];
        var crisisId = crisis_table_values[key]["crisisID"];
        var crisisAddress = crisis_table_values[key]["crisisAddress"];
      }
  }

  console.log("team = ", team, "crisisId = ", crisisId);

  // Get the values at team, crisisId, and crisisAddress. I need to write this as a promise thats fulfilled
  // before the get device tokens promise

    // Get the list of device notification tokens.

    const getTeamMemberNotifications = admin.database().ref(`/teams/${team}/teamMembers/`).once('value');

    return Promise.all([getTeamMemberNotifications]).then(results =>  {
      var teamMembers = results[0].val();
      var tokens = [];

      console.log("The first team member is ", teamMembers[0]);

      for (var key in teamMembers) {
        if (teamMembers.hasOwnProperty(key)) {
          console.log(key + " -> " + teamMembers[key]["token"]);
          tokens.push(teamMembers[key]["token"]);
        }
      }

      // Notification details.
      const payload = {
        data: {
          crisis_id: crisisId,
          crisis_address: crisisAddress
        }
      };

      // testing

      var token = 0;

      // Send notifications to all tokens.
      return admin.messaging().sendToDevice(tokens[0], payload).then(response => {
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

