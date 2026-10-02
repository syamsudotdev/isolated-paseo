FROM node:24-bookworm-slim

ENV HOME=/home/node \
    XDG_CONFIG_HOME=/home/node/.config \
    XDG_DATA_HOME=/home/node/.local/share \
    XDG_CACHE_HOME=/home/node/.cache \
    NPM_CONFIG_CACHE=/home/node/.cache/npm \
    PASEO_HOME=/home/node/.paseo \
    PASEO_LISTEN=0.0.0.0:6767 \
    PASEO_WEB_UI_ENABLED=true

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash ca-certificates curl git jq openssh-client python3 build-essential ripgrep tini \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g @getpaseo/cli@0.10.2 \
    && npm install -g --ignore-scripts @earendil-works/pi-coding-agent@1.0.0 \
    && mkdir -p /home/node/.paseo /home/node/.pi/agent /home/node/.cache \
        /home/node/.config /home/node/.local/share /home/node/.local/state /home/node/.gradle/init.d \
    && chown -R 1000:1000 /home/node

COPY --chown=1000:1000 defaults/gradle.properties /home/node/.gradle/gradle.properties
COPY --chown=1000:1000 defaults/init.d/test-forks.gradle /home/node/.gradle/init.d/test-forks.gradle

USER node
WORKDIR /workspace
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["paseo", "daemon", "run"]
