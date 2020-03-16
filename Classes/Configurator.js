const Common = require(`${ROOT_DIR}/Classes/Common`);
const nconf = require('nconf');
const fs = require('fs-extra');

module.exports = class Configurator extends Common {
    async init() {
        this.nconf = nconf;
        this.files = await fs.readdir(this.path);

        this.isIndex();
        this.defaultIndex && await this.setIndex();
        this.removeIndex();

        for (let file of this.files) {
            const obj = {};
            obj[file.replace('.json', '')] = await this.readFile(file.replace('.json', ''));
            this.nconf.overrides(obj);
        }
        this.get = this.nconf.get.bind(this.nconf);
    }

    isIndex() {
        const index = this.files.indexOf('index.json');
        this.defaultIndex = index >= 0 ? index : false;
    }

    async setIndex() {
        const od = await this.readFile('index');
        this.nconf.defaults(od);
    }

    removeIndex() {
        this.files.splice(this.defaultIndex, 1);
    }

    readFile(name) {
        return fs.readJson(`${this.path}/${name}.json`);
    }
};
