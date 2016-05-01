var fs = require('fs.extra');
var glob = require("glob")

var downloadDirectory = 'C:/Users/JamieLaptop/Downloads/';
var salariesDirectory = 'C:/Workd/MLBDFS/salaries/';

var salaryFiles = ['DKSalaries.csv', 'FantasyAcesGamePlayers.csv'];
var finalFileNames = ['DKSalaries.csv', 'FASalaries.csv', 'FDSalaries.csv'];

salaryFiles.forEach(function(file, index){
  salaryFiles[index] = downloadDirectory + file;
});

// options is optional
glob("C:/Users/JamieLaptop/Downloads/FanDuel-MLB*.csv", function (er, files) {
  salaryFiles.push(files[0]);
  moveFiles();
});


var moveFiles = function moveFiles(){
  salaryFiles.forEach(function(file, index){
    var newLocation = salariesDirectory + finalFileNames[index];
    fs.move(file, newLocation, function (err) {
      console.log('Moved ' + file + ' to ' + newLocation);
    });
  })
}
