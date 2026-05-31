import fs from "fs";
import { decrypt, encrypt, generateKey, legacyDecrypt } from "./crypt.js";

export class Var {
    /**
     * @param {string} key - The secret variable name.
     * @param {() => any} generator - Function that generates a default value if not found.
     */
    constructor(key, generator) {
        this.key = key;
        this.generator = generator;
    }
}

export class Secrets {

    constructor(filepath, vars, legacyFilepath = null) {
        this.filepath = filepath;
        this.legacyFilepath = legacyFilepath;
        this.vars = vars;
        this.secretsMap = new Map();
        this.obj = null
        this.isOpen = false
        this.key = null
        this.isInit = !fs.existsSync(filepath)
        this.obj = this.isInit ? {
            encryptedSecrets: {},
            keySlots: []
        } : JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }

    addKeySlot(password) {
        this.obj.keySlots.push(encrypt(this.key, { password }))
    }

    getKey(password) {
        let key;

        for (const keySlot of this.obj.keySlots) {
            try {
                key = decrypt(keySlot, { password });
                if (key) break;
            } catch (error) {
                if (!error.message.includes("bad decrypt")) {
                    throw error;
                }
            }
        }

        if (key == null) {
            throw new Error("bad decrypt");
        }

        return key
    }

    open(password) {

        if (this.isInit) {
            if (this.legacyFilepath && fs.existsSync(this.legacyFilepath)) {
                this.encryptedSecrets = legacyDecrypt(fs.readFileSync(this.legacyFilepath, 'utf8'), password)
            }

            this.key = generateKey()
            this.addKeySlot(password)
        } else {
            this.key = this.getKey(password)
        }

        for (const v of this.vars) {
            const encrypted = this.obj.encryptedSecrets?.[v.key];
            const value = encrypted
                ? JSON.parse(decrypt(encrypted, { key: this.key }))
                : v.generator();
            this.secretsMap.set(v.key, value);
        }

        this.isOpen = true

        this.save()
    }

    getIsInit() {
        return this.isInit;
    }

    getIsOpen() {
        return this.isOpen;
    }

    getSecrets(json = true) {
        return json ? Object.fromEntries(this.secretsMap) : this.secretsMap;
    }

    save() {
        for (const v of this.vars) {
            this.obj.encryptedSecrets[v.key] = encrypt(JSON.stringify(this.secretsMap.get(v.key)), { key: this.key });
        }
        fs.writeFileSync(this.filepath, JSON.stringify(this.obj));
    }
}