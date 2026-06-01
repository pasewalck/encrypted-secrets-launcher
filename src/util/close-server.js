export function closeServer(server, onComplete, onMessage, waitSeconds = 0) {
	if (waitSeconds <= 0) {
		onMessage(false, 'Stopping Webserver');
		server.close(
			() => {
				onMessage(false, 'Stopped Webserver');
				onComplete();
			},
			(error) => {
				if (error) {
					onMessage(true, 'Error stopping Webserver: ', error);
				}
				closeServer(server, onComplete, onMessage, 5);
			}
		);
		server.closeAllConnections();
	} else {
		onMessage(false, 'Stopping Webserver in', waitSeconds, 'seconds');
		setTimeout(() => {
			closeServer(server, onComplete, onMessage);
		}, 1000 * waitSeconds);
	}
}
