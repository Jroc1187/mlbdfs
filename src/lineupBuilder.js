var Combinatorics = require('js-combinatorics');

var buildLineup = function (players, site, differenceSite) {
    var currentLineup;
    var currentMetadata;

    var emptyLineup = {
        'P1':{},
        'P2':{},
        'C':{},
        '1B':{},
        '2B':{},
        '3B':{},
        'SS':{},
        'OF1':{},
        'OF2':{},
        'OF3':{}
    };

    var metaData = {
        'Salary':{},
        'EstimatedPoints':{},
        'TotalSavings':{}
    }

    var pitchers = players['P'];
    var catchers = players['C'];
    var firstbase = players['1B'];
    var secondbase = players['2B'];
    var thirdbase = players['3B'];
    var shortstop = players['SS'];
    var outfielders = players['OF'];

    var finalLineups = [];
    var pitcherCombinations = Combinatorics.combination(pitchers, 2).toArray();
    var outfielderCombinations = Combinatorics.combination(outfielders, 3).toArray();

    var counter = 0;
    var secondcounter = 0;

    pitcherCombinations.forEach(function(pitcherCombination){

        console.log('Almost there: ' + (counter/pitcherCombinations.length * 100) + '%');
        counter++;

        currentLineup = emptyLineup;
        currentMetadata = metaData;

        currentLineup.P1 = pitcherCombination[0];
        currentLineup.P2 = pitcherCombination[1];

         for(var k = 0; k < catchers.length; k++) {
             console.log('Almost there #2: ' + (secondcounter/catchers.length * 100) + '%');
             secondcounter++;

             currentLineup.C = catchers[k];
             for (var l = 0; l < firstbase.length; l++) {
                 if (checkPitchers(currentLineup, firstbase[l])) {
                     continue;
                 }
                 currentLineup['1B'] = firstbase[l];
                 for (var m = 0; m < secondbase.length; m++) {
                     if (checkPitchers(currentLineup, secondbase[m])) {
                         continue;
                     }
                     currentLineup['2B'] = secondbase[m];
                     for (var n = 0; n < thirdbase.length; n++) {
                         if (checkPitchers(currentLineup, thirdbase[n])) {
                             continue;
                         }
                         currentLineup['3B'] = thirdbase[n];
                         for (var o = 0; o < shortstop.length; o++) {
                             if (checkPitchers(currentLineup, shortstop[o])) {
                                 continue;
                             }
                             currentLineup['SS'] = shortstop[o];

                             outfielderCombinations.forEach(function (outfielderCombination) {
                                 if (checkPitchers(currentLineup, outfielderCombination[0]) ||
                                     checkPitchers(currentLineup, outfielderCombination[1]) ||
                                     checkPitchers(currentLineup, outfielderCombination[2])) {
                                     return;
                                 }

                                 currentLineup['OF1'] = outfielderCombination[0];
                                 currentLineup['OF2'] = outfielderCombination[1];
                                 currentLineup['OF3'] = outfielderCombination[2];

                                 var salary = 0;
                                 var estimatedPoints = 0;
                                 var totalDifference = 0;
                                 for (var position in currentLineup) {
                                     estimatedPoints += currentLineup[position].dkpoints;
                                     salary += currentLineup[position][site];
                                     totalDifference += currentLineup[position][differenceSite];
                                 }
                                 if (salary > 49800 && salary <= 50000) {
                                     currentMetadata.EstimatedPoints = estimatedPoints;
                                     currentMetadata.Salary = salary;
                                     currentMetadata.TotalSavings = totalDifference;
                                     finalLineups.push(Object.assign({}, currentLineup, currentMetadata));
                                 }
                             });
                         }
                     }
                 }
             }
         }
     });



    return finalLineups.sort(sortTotalSavings);
}

var checkPitchers = function (currentLineup, player) {
    if(currentLineup.P1.team == player.opponent || currentLineup.P2.team == player.opponent){
        return true;
    }
    return false;
};

var sortTotalSavings = function(a,b){
    return a.TotalSavings - b.TotalSavings;
}

var sortTotalPoints = function(a,b){
    return b.EstimatedPoints - a.EstimatedPoints;
}

module.exports = {
    buildLineup: buildLineup
};