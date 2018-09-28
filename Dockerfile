FROM ubuntu:16.04

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      cmake \
      curl \
      g++ \
      git \
      libjson-c2 \
      libjson-c-dev \
      libssl1.0.0 \
      libssl-dev \
      libwebsockets7 \
      libwebsockets-dev \
      pkg-config \
      vim-common \
    && git clone --depth=1 https://github.com/santosh0705/ttyd-express.git /tmp/ttyd \
    && cd /tmp/ttyd && mkdir build && cd build \
    && cmake -DCMAKE_BUILD_TYPE=RELEASE .. \
    && make \
    && make install \
    && apt-get remove -y --purge \
        cmake \
        g++ \
        libwebsockets-dev \
        libjson-c-dev \
        libssl-dev \
        pkg-config \
    && apt-get purge -y \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/ttyd

EXPOSE 7681

ENTRYPOINT ["ttyd"]

CMD ["bash"]
