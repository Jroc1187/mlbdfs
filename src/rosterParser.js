var fs = require('fs');
var parse = require('csv-parse');
var request = require('request');
var Table = require('cli-table');
var latinize = require('latinize');

var dkSalaries ='../salaries/DKSalaries.csv';
var fdSalaries ='../salaries/FDSalaries.csv';

var players = [];
var comparisonValues = ['fdsalary', 'fdraftsalary', 'yhsalary'];

var table = new Table({
    head: ['Player', 'Difference', 'Percent', 'DK Salary', 'FD Salary', 'YH Salary', 'FD Difference', 'YH Difference', 'Position']
  , colWidths: [18, 7, 7, 7, 7, 7, 7, 7, 7]
});

var dkparser = parse({delimiter: ','}, function (err, data) {
  data.forEach(function(player) {
      players.push({
        'name': player[1],
        'dksalary': player[2],
        'position': player[0]
      });
  });

  fs.createReadStream(fdSalaries).pipe(fdparser);
});

var fdparser = parse({delimiter: ','}, function (err, data) {
  data.forEach( function(player) {
    var name = player[2] + ' ' + player[3];
    players.forEach( function(thisplayer) {
      if(thisplayer.name == name){
        thisplayer['fdsalary'] = player[6];
      }
    });
  });


  request('https://dfyql-ro.sports.yahoo.com/v2/external/playersFeed/mlb', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var finalResults = JSON.parse(body);
      finalResults.players.result.forEach(function(yahooplayer){
        players.forEach( function(thisplayer) {
          var cleanName = latinize(yahooplayer.name);
          if(thisplayer.name == cleanName){
            thisplayer['yhsalary'] = yahooplayer.salary * 250;
          }
        });
      });

      done();
    }
  });
});

fs.createReadStream(dkSalaries).pipe(dkparser);

var done = function() {
  players.forEach(function(player){
    player.difference = 0;
    comparisonValues.forEach(function(comparison) {
      var diffVariable = comparison + 'difference';
      if(player[comparison] == null){
        player[comparison] = "";
        player[diffVariable] = "";
      }else{
        var difference = player.dksalary - player[comparison];
        player[diffVariable] =  difference;
        player.difference += difference;
      }
    });

    player.percentage = (-player.difference/player.dksalary) * 100 + '%';

  });

  var sortedArray = players.sort(function(a,b) {
    return a.difference - b.difference;
  });

  sortedArray.forEach(function(player){
    if(player.position != 'SP' && player.position != 'RP' && player.difference != 10000){
      table.push([player.name, player.difference, player.percentage, player.dksalary, player.fdsalary, player.yhsalary, player.fdsalarydifference, player.yhsalarydifference, player.position]);
    }
  });

  //console.log(table);
  console.log(table.toString());
}
