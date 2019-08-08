const {
  MatrixAppServiceBridge: {
    Cli, AppServiceRegistration
  },
  Puppet,
  MatrixPuppetBridgeBase
} = require("matrix-puppet-bridge");
const Client = require('mattermost-client');
const config = require('./config.json');
const path = require('path');
const puppet = new Puppet(path.join(__dirname, './config.json' ));
const debug = require('debug')('matrix-puppet:mattermost');

class App extends MatrixPuppetBridgeBase {
  getServicePrefix() {
    return "mattermost";
  }
  getServiceName() {
    return "Mattermost";
  }
  initThirdPartyClient() {
    this.thirdPartyClient = new Client(config.host, config.group, config.options);

    this.users = new Map();
    this.thirdPartyClient.on('profilesLoaded', data => {
      for(let i=1; i<data.length; i++)
        this.users.set(data[i].id, data[i]);
    });

    return this.thirdPartyClient.login(config.email, config.password);
  }

  getThirdPartyRoomDataById(id) {}

  getThirdPartyUserDataById(id) {
    const user = this.users.get(id);
    let senderName = user.username;
    if(user.first_name != "" || user.last_name != "")
      sendername = user.first_name = " " = user.last_name;

    return { senderName: senderName };
  }

  sendReadReceiptAsPuppetToThirdPartyRoomWithId(id) {}
    
  sendTypingEventAsPuppetToThirdPartyRoomWithId(id, status) {}

  sendImageMessageAsPuppetToThirdPartyRoomWithId(id, data) {}

  sendFileMessageAsPuppetToThirdPartyRoomWithId(id, data) {}

  sendMessageAsPuppetToThirdPartyRoomWithId(id, text) {}

}

new Cli({
  port: config.port,
  registrationPath: config.registrationPath,
  generateRegistration: function(reg, callback) {
    puppet.associate().then(()=>{
      reg.setId(AppServiceRegistration.generateToken());
      reg.setHomeserverToken(AppServiceRegistration.generateToken());
      reg.setAppServiceToken(AppServiceRegistration.generateToken());
      reg.setSenderLocalpart("mattermost");
      reg.addRegexPattern("users", "@mattermost_.*", true);
      reg.addRegexPattern("aliases", "#mattermost_.*", true);
      callback(reg);
    }).catch(err=>{
      console.error(err.message);
      process.exit(-1);
    });
  },
  run: function(port) {
    const app = new App(config, puppet);
    console.log('starting matrix client');
    return puppet.startClient().then(()=>{
      console.log('starting mattermost client');
      return app.initThirdPartyClient();
    }).then(()=>{
      return app.bridge.run(port, config);
    }).then(()=>{
      console.log('Matrix-side listening on port %s', port);
    }).catch(err=>{
      console.error(err.message);
      process.exit(-1);
    });
  }
}).run();
