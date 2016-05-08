var fs = require('fs');
var parse = require('csv-parse');
var request = require('request');
var Table = require('cli-table');
var latinize = require('latinize');
var lineupBuilder = require('./lineupBuilder');
var commandLineArgs = require('command-line-args');

var dkSalaries ='../salaries/DKSalaries.csv';
var fdSalaries ='../salaries/FDSalaries.csv';

var players = [];
var lineupPlayers = {}
var comparisonValues = ['fdsalary', 'yhsalary', 'dksalary'];
var allTypes = ['dksalary', 'fdsalary', 'yhsalary'];

var buildPositionObject = function(positions, allTypes) {

  var positionObject = {};

  positions.forEach(function(position){
    positionObject[position] = {};
    allTypes.forEach(function(type) {
      positionObject[position][type] = {
        'TotalPlayers': 0,
        'TotalSalary': 0,
        'AverageSalary': 0
      };
    });
  });

  return positionObject;
};


var positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF'];
var allPositions = buildPositionObject(positions, allTypes);
var lineupPlayers = {};

positions.forEach(function(position){
  lineupPlayers[position] = [];
});

var table = new Table({
    head: ['Player', 'Difference', 'Percent', 'DK Salary', 'FD Salary', 'YH Salary', 'FD Difference', 'YH Difference', 'Position']
  , colWidths: [18, 10, 10, 10, 10, 10, 10, 10, 10]
});

var positionalSalaryTable = new Table({
  head: ['Position', 'DKAverage', 'FDAverage', 'YHAverage']
  , colWidths: [10, 10, 10, 10]
});

var generatedLineupsTable = new Table({
  head: ['Pitcher', 'Pitcher', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'Estimated Points', 'Total Savings']
  , colWidths: [18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18]
});

var startingLineupString = '';

var cli = commandLineArgs([
  { name: 'site', alias: 's', type: String },
  { name: 'pitchers', type: String, multiple: true, },
])

var options = cli.parse();

var differenceSite = 'difference';
var salarySite = 'dksalary';
if(options.site == 'yahoo'){
  differenceSite = 'differenceyh';
  salarySite = 'yhsalary';
}


request('http://www.rotowire.com/baseball/daily_lineups.htm', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    startingLineupString = body;
    fs.createReadStream(dkSalaries).pipe(dkparser);
  }
});

var dkparser = parse({delimiter: ','}, function (err, data) {

  data.forEach(function(player) {
    if(startingLineupString.indexOf(player[1]) > -1){
      players.push({
        'name': player[1],
        'position': player[0],
        'team': player[5],
        'opponent': player[3].split(' ')[0].split('@')[0] == player[5] ? player[3].split(' ')[0].split('@')[1]: player[3].split(' ')[0].split('@')[0],
        'dksalary': parseInt(player[2]),
        'dkpoints': parseFloat(player[4])

      });
    }
  });
  players.shift();
  fs.createReadStream(fdSalaries).pipe(fdparser);

});

var fdparser = parse({delimiter: ','}, function (err, data) {
  data.forEach( function(player) {
    var name = player[2] + ' ' + player[3];
    players.forEach( function(thisplayer) {
      if(thisplayer.name == name){
        thisplayer['fdsalary'] = parseInt(player[6]);
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

var setPositionalSalary = function(player) {
  for(var position in allPositions ){
    if(player.position.indexOf(position) > -1){
      allTypes.forEach(function(type){
        if(player[type]){
          allPositions[position][type].TotalPlayers++;
          allPositions[position][type].TotalSalary += parseInt(player[type]);
        }
      });
    }
  }
};

var calculatePositionalSalary = function() {
  players.forEach(function(player){
    setPositionalSalary(player);
  });

  for(var position in allPositions){
    allTypes.forEach(function(type){
      allPositions[position][type].AverageSalary = allPositions[position][type].TotalSalary / allPositions[position][type].TotalPlayers;
    });
  }
};

var findDifference = function(player, comparison, comparitor) {
  var averageDifferece = 0;
  for (var position in allPositions) {
    if (player.position.indexOf(position) > -1) {
      averageDifferece = allPositions[position][comparitor].AverageSalary - allPositions[position][comparison].AverageSalary;
      break;
    }
  }

  return averageDifferece;
};

var done = function() {
  calculatePositionalSalary();
  players.forEach(function(player){

    player.difference = 0;
    player.differenceyh = 0;
    comparisonValues.forEach(function(comparison) {
      var diffVariable = comparison + 'difference';
      if(player[comparison] == null){
        player[comparison] = "";
        player[diffVariable] = "";
      }else{
        var difference = player.dksalary - (player[comparison] + parseInt(findDifference(player, comparison, 'dksalary')));
        var differenceyh = player.yhsalary - (player[comparison] + parseInt(findDifference(player, comparison, 'yhsalary')));
        player[diffVariable] =  difference;
        player.difference += difference;
        player.differenceyh += differenceyh;
      }
    });

    player.percentage = parseInt((-player.difference/player.dksalary) * 100) + '%';

  });

  var sortingFunction =  {
    draftkings: function(a,b) {
      return a.difference - b.difference;
    },
    yahoo: function(a,b) {
      return a.differenceyh - b.differenceyh
    }
  };

  var findPlayerByName = function (playername) {
    var playerObject = {};

    players.some(function (player) {
      if(player.name == playername){
        playerObject = player;
        return true;
      }
    })

    return playerObject;
  };

  var checkDuplicatePlayers = function (lineup) {
    for (var player1 in lineup){
      for (var player2 in lineup){
        if(lineup[player1].name == lineup[player2].name && player1 != player2 && typeof lineup[player1] == "object" && typeof lineup[player2] == "object" ){
          return true;
        }
      }
    }

    return false;
  }

  var sortedArray = players.sort(sortingFunction[options.site]);

  sortedArray.forEach(function(player){
    if(player.difference != 10000){
      table.push([player.name, player[differenceSite], player.percentage, player.dksalary, player.fdsalary, player.yhsalary, player.fdsalarydifference, player.yhsalarydifference, player.position]);
    }

    if(player[differenceSite] <= -500 && player.yhsalary > 2000){
      for(var position in lineupPlayers){
        if(player.position.indexOf(position) > -1){
          lineupPlayers[position].push(player);
        }
      }
    }
  });


  if(options.pitchers.length > 0) {
    lineupPlayers.P = [];

    options.pitchers.forEach(function (pitcher) {
      lineupPlayers['P'].push(findPlayerByName(pitcher));
    })
  }

  var lineups = lineupBuilder.buildLineup(lineupPlayers, salarySite, differenceSite);
  var maxlineups = 10;
  var counter = 0;

  lineups.forEach(function (lineup) {
    if(checkDuplicatePlayers(lineup)){
      return;
    }
    if(counter <= maxlineups) {
      generatedLineupsTable.push([lineup.P1.name, lineup.P2.name, lineup.C.name, lineup['1B'].name, lineup['2B'].name, lineup['3B'].name, lineup.SS.name, lineup.OF1.name, lineup.OF2.name, lineup.OF3.name, lineup.EstimatedPoints, lineup.TotalSavings]);
    }
    counter++;
  });

  for(var position in allPositions){
    var positionObject = allPositions[position];
    positionalSalaryTable.push([position, positionObject.dksalary.AverageSalary, positionObject.fdsalary.AverageSalary, positionObject.yhsalary.AverageSalary])
  }

  //console.log(table);

  console.log(positionalSalaryTable.toString());
  console.log(table.toString());
  console.log(generatedLineupsTable.toString());
}
