package com.haodaone.remotesupport.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RustDeskConfiguration {
    private final String idServer;
    private final String relayServer;
    private final String publicKey;
    private final String configString;
    private final String installerPath;
    private final String installerSha256;
    public RustDeskConfiguration(@Value("${app.rustdesk.id-server:}") String idServer,
                                 @Value("${app.rustdesk.relay-server:}") String relayServer,
                                 @Value("${app.rustdesk.public-key:}") String publicKey,
                                 @Value("${app.rustdesk.config-string:}") String configString,
                                 @Value("${app.rustdesk.installer-path:}") String installerPath,
                                 @Value("${app.rustdesk.installer-sha256:}") String installerSha256) {
        this.idServer=idServer; this.relayServer=relayServer; this.publicKey=publicKey; this.configString=configString; this.installerPath=installerPath; this.installerSha256=installerSha256;
    }
    public String idServer(){return idServer;} public String relayServer(){return relayServer;} public String publicKey(){return publicKey;} public String configString(){return configString;} public String installerPath(){return installerPath;} public String installerSha256(){return installerSha256;}
    public boolean configured(){return !idServer.isBlank()&&!relayServer.isBlank()&&!publicKey.isBlank()&&!configString.isBlank();}
}