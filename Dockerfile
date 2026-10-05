FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

ENV HOME=/home/node \
    XDG_CONFIG_HOME=/home/node/.config \
    XDG_DATA_HOME=/home/node/.local/share \
    XDG_CACHE_HOME=/home/node/.cache \
    NPM_CONFIG_CACHE=/home/node/.cache/npm \
    PASEO_HOME=/home/node/.paseo \
    PASEO_LISTEN=0.0.0.0:6767 \
    PASEO_WEB_UI_ENABLED=true \
    LANG=C.UTF-8 LC_ALL=C.UTF-8 \
    MISE_CONFIG_DIR=/opt/toolchain \
    MISE_DATA_DIR=/opt/toolchain/mise \
    MISE_CACHE_DIR=/home/node/.cache/toolchain/mise \
    RUSTUP_HOME=/opt/toolchain/rustup \
    CARGO_HOME=/opt/toolchain/cargo \
    ANDROID_HOME=/opt/toolchain/android-sdk \
    ANDROID_USER_HOME=/home/node/.local/share/toolchain/android \
    ANDROID_CLI_BIN=/opt/toolchain/bin/android

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash ca-certificates curl git jq openssh-client procps=2:4.0.2-3 build-essential tini unzip \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /opt/toolchain/bin /opt/toolchain/mise /opt/toolchain/apps /opt/toolchain/rustup /opt/toolchain/cargo \
      /opt/toolchain/android-sdk /home/node/.paseo /home/node/.pi/agent \
      /home/node/.agents/skills /home/node/.cache /home/node/.gradle/init.d \
      /home/node/.local/share/toolchain/cargo /home/node/.local/share/toolchain/android \
    && curl -fsSL https://github.com/jdx/mise/releases/download/v2026.10.1/mise-v2026.10.1-linux-x64 -o /opt/toolchain/bin/mise \
    && echo '31e6859cf639ed4594906da3fcd0fe2055e9daddae75e9786dbe50b3fb3c0f4a  /opt/toolchain/bin/mise' | sha256sum -c - \
    && chmod 755 /opt/toolchain/bin/mise

COPY defaults/mise.toml defaults/mise.lock /opt/toolchain/
COPY defaults/.mise/ /opt/toolchain/.mise/
RUN /opt/toolchain/bin/mise -C /opt/toolchain install --jobs 3
COPY defaults/apps/package.json defaults/apps/package-lock.json /opt/toolchain/apps/
COPY scripts/ /opt/toolchain/scripts/
RUN chmod 755 /opt/toolchain/scripts/*.sh \
    && mv /opt/toolchain/mise/installs/android-cli/1.0.16500706/android /opt/toolchain/mise/installs/android-cli/1.0.16500706/android.launcher \
    && curl -fsSL --compressed https://dl.google.com/android/cli/1.0.16500706/linux_x86_64/android-cli -o /opt/toolchain/mise/installs/android-cli/1.0.16500706/android.real \
    && echo '508840c2a9ce8768a9246ec7962834713967b46dd0cf0dad80fcde3d444947c0  /opt/toolchain/mise/installs/android-cli/1.0.16500706/android.real' | sha256sum -c - \
    && chmod 755 /opt/toolchain/mise/installs/android-cli/1.0.16500706/android.real \
    && ln -s /opt/toolchain/scripts/android.sh /opt/toolchain/mise/installs/android-cli/1.0.16500706/android \
    && ln -s /opt/toolchain/scripts/android.sh /opt/toolchain/bin/android
RUN /opt/toolchain/bin/mise -C /opt/toolchain exec -- sh -c 'cd /opt/toolchain/apps && npm ci --omit=dev --no-audit --no-fund' \
    && /opt/toolchain/bin/mise -C /opt/toolchain run android-sdk \
    && rm -rf /home/node/.cache/*
COPY defaults/ /opt/toolchain/defaults/
# Startup initializes these launchers in writable Cargo storage before mise checks Rust.
RUN ln -sfnT /home/node/.local/share/toolchain/cargo/bin /opt/toolchain/mise/installs/rust/1.99.0 \
    && chown -R 0:0 /home/node
ENV CARGO_HOME=/home/node/.local/share/toolchain/cargo \
    PATH=/opt/toolchain/bin:/opt/toolchain/apps/node_modules/.bin:/opt/toolchain/android-sdk/platform-tools:/opt/toolchain/android-sdk/cmdline-tools/23.0/bin:/opt/toolchain/android-sdk/build-tools/37.0.0:$PATH
USER root
WORKDIR /workspace
ENTRYPOINT ["/usr/bin/tini", "--", "/opt/toolchain/scripts/entrypoint.sh"]
CMD ["/opt/toolchain/apps/node_modules/.bin/paseo", "daemon", "run"]
