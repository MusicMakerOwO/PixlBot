const { SECONDS } = require("../Constants");
const Database = require("../Database");
const { warn, error, success } = require("../Logs");
const TaskScheduler = require("../TaskScheduler");

const TIME_BETWEEN_TASKS = SECONDS.MINUTE * 10; // 10 minutes

const TASK = {

}

const TaskFunctions = {

}

const TASK_INTERVAL = {

}

let longestName = 0;

let i = 0;
for (const [name, callback] of Object.entries(TaskFunctions)) {
	i++;
	if (name === undefined) {
		warn(`Task ${i} is undefined, skipping...`);
		delete TaskFunctions[name];
		return;
	}

	if (name.length > longestName) {
		longestName = name.length;
	}

	if (typeof callback !== 'function') {
		warn(`Task "${name}" is not a function, skipping...`);
		delete TaskFunctions[name];
		continue;
	}

	TASK_INTERVAL[name] *= 1000; // convert to milliseconds
}

module.exports.StartTasks = function StartTasks() {
	const totalTasks = Object.keys(TaskFunctions).length;
	if (totalTasks === 0) {
		warn("No tasks to manage - nothing to do!");
		return;
	} else {
		success(`Starting ${totalTasks} automatic tasks...`);
	}

	let i = -1;
	for (const [name, callback] of Object.entries(TaskFunctions)) {
		i++;
		const interval = TASK_INTERVAL[name];
		if (interval === undefined) {
			warn(`Task "${name}" does not have a defined interval, skipping...`);
			continue;
		}

		const lastRun = Database.prepare("SELECT last_run FROM Timers WHERE id = ?").pluck().get(name) || 0;

		const now = Date.now();
		const timeSinceLastRun = Math.max(0, now - lastRun);

		const offset = (TIME_BETWEEN_TASKS * 1000) * i;
		const delay = Math.max(timeSinceLastRun >= interval ? 0 : interval - timeSinceLastRun, offset);

		TaskScheduler.schedule(() => {
			try {
				callback();
				Database.prepare("INSERT OR REPLACE INTO Timers (id, last_run) VALUES (?, ?)").run(name, Date.now());
			} catch (err) {
				error(err);
			}
		}, delay, interval);

		// success(`Scheduled task "${name}" to run every ${interval / 1000} seconds (delayed by ${delay / 1000 / 60} minutes)`);

		success(`[TASKS] - "${name}"${' '.repeat(longestName - name.length)} : delayed ${(delay / 1000 / 60).toFixed(2)} minutes`);
	}
}
