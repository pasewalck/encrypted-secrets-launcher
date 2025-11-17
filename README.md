# Encrypted Secrets Launcher

This project implements a launcher that provides encrypted secrets storage. Secrets are passed from the launcher to the started application after an admin password is provided.

This project was designed for use in conjunction with the project [Aktivistio Accounts](https://github.com/pasewalck/aktivistio-accounts)

## Example Usage

```
import { createLauncher,Secret } from "encrypted-secrets-launcher";

createLauncher(
    [
        new Secret("DATABASE_KEY",() => generateSecretFunction())
    ],"data/database-secrets.txt",3000,() => {
        const password = generatePasswordFunction(40)
        console.log(`Launcher initiated with new password: ${password}`)
        return password;
    },(secrets) => {
        console.log("Starting main service ...")
        const child = spawn('node', ['src/server.js'], {
            env: {
                ...process.env,
                ...secrets
            },
            stdio: 'inherit'
        });
    },(secrets) => {

    },(isError,...message) => {
        if(isError)
            console.error(message.join(" "))
        else
            console.log(message.join(" "))
    },new URL("http://localhost:3000/health")
)

```

## License and Warranty

Copyright (C) 2025 Jana Caroline Pasewalck

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not,
see <https://www.gnu.org/licenses/>.