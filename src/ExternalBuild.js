
var _ = require('lodash');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var colors = require('colors');

module.exports = function(bosco) { 
    
    var AssetHelper = require('./AssetHelper')(bosco);

    return {
		doBuild: doBuild
	}

	function doBuild(service, options, next) {

		if(!service.build) return next();

		var watchBuilds = options.watchBuilds, 
			reloadOnly = options.reloadOnly,
			tagFilter =  options.tagFilter;

	    var command = watchBuilds ? (service.build.watch ? service.build.watch.command : service.build.command) : service.build.command;
	    command = reloadOnly ? "echo 'Not running build as change triggered by external build tool'" : command;

	    var buildFinished = function(err, stdout, stderr) {

	        if (err) {
	            bosco.error(stderr);
	        }

	        console.log(stdout);	        

	        next(null);

	    }

	    if (watchBuilds) {

	        bosco.log("Spawning watch command for " + service.name.blue + ": " + command);

	        var cmdArray = command.split(" ");
	        var command = cmdArray.shift();
	        var wc = spawn(command, cmdArray, {
	            cwd: service.repoPath
	        });
	        var readyText = service.build.watch.ready || 'finished';
	        var stdout = "", stderr = "",
	            calledReady = false;
	        var checkDelay = 500; // Seems reasonable for build check cycle	
	        var timeout = checkDelay * 50; // Before it starts checkign for any stdout
	        var timer = 0;

	        wc.stdout.on('data', function(data) {
	            stdout += data.toString();
	        });

	        wc.stderr.on('data', function(data) {
	            stderr += data.toString();
	        });

	        var checkFinished = function() {
	            if (stdout.indexOf(readyText) >= 0 && !calledReady) {
	                calledReady = true;	  
	                buildFinished(null, stdout, null);	             		               	              
	            } else if (stderr && !calledReady) {
	            	// This doesn't really get called, most build tools output to stdout
	            	calledReady = true;
	                buildFinished(stderr);
	            } else {
	            	timer = timer + checkDelay;
	                if(timer < timeout) {
	                	setTimeout(checkFinished, checkDelay);
	                } else {
	                	bosco.error("Build timed out beyond " + timeout/1000 + " seconds, likely an issue with the project build - you may need to check locally.");	                	
	                	console.error(stdout);
	                }
	            }
	        }

	        checkFinished();

	    } else {

	        bosco.log("Running build command for " + service.name.blue + ": " + command);
	        exec(command, {
	            cwd: service.repoPath
	        }, buildFinished);

	    }

	}

}