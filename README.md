# Encrypted Secrets Launcher

This project implements a launcher that provides encrypted secrets storage. Secrets are passed from the launcher to the started application after an admin password is provided.

This project was designed for use in conjunction with the project [Aktivistio Accounts](https://github.com/pasewalck/aktivistio-accounts)

## Example Usage

```
import { createLauncher, Var } from "encrypted-secrets-launcher";

createLauncher(
    [
        new Var("DATABASE_KEY", () => generateSecretFunction())
    ],
    {
        filepath: "data/database-secrets.txt",
        legacyFilepath: "data/database-secrets.txt",
        port: 3000,
        generatePasswort: () => {
            const password = generatePasswordFunction(40)
            console.log(`Launcher initiated with new password: ${password}`)
            return password;
        },
        onComplete: (secrets) => {
            console.log("Starting main service ...")
            const child = spawn('node', ['src/server.js'], {
                env: {
                    ...process.env,
                    ...secrets
                },
                stdio: 'inherit'
            });
        },
        onUnlock: (secrets) => {

        },
        onMessage: (isError, ...message) => {
            if (isError)
                console.error(message.join(" "))
            else
                console.log(message.join(" "))
        },
        healthCheckUrl: new URL("http://localhost:3000/health"),
    }
)

```

## Auto Unlocking

This app implements an REST API. It includes route

- GET `/api/status`: Provides status
- POST `/api/unlock`: Takes in {password: "secret"} and unlocks the service.

Under https://github.com/pasewalck/encrypted-secrets-launcher/tree/main/auto-unlocker an example timed service is provided that can be deployed on a different server and setup to unlock the launcher. See https://github.com/pasewalck/encrypted-secrets-launcher/tree/main/auto-unlocker/README.md for details.

## License and Warranty

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not,
see <https://www.gnu.org/licenses/>.
