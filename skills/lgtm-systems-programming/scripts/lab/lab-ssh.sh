#!/usr/bin/env bash
# lab-ssh.sh — ssh into a lab guest over AF_VSOCK (no guest IP, no host port).
#   export LAB_PREFIX=myproject
#   ./lab-ssh.sh                          # interactive shell on <prefix>-target
#   ./lab-ssh.sh myproject-target uname -r
#   ./lab-ssh.sh myproject-target --wait  # block until sshd answers (used by lab-up.sh)
#
# The destination fedora@qemu:system/<vm> is resolved by libvirt's ssh proxy
# (/etc/ssh/ssh_config.d/30-libvirt-ssh-proxy.conf, package libvirt-ssh-proxy);
# the guest's systemd starts sshd on vsock by itself. Guest host keys go to a
# lab-only known_hosts file, never ~/.ssh/known_hosts.
set -euo pipefail
LAB_PREFIX="${LAB_PREFIX:-lab}"
CACHE_DIR="${LAB_CACHE:-$HOME/.cache/${LAB_PREFIX}-lab}"
VM="${1:-${TARGET_VM:-${LAB_PREFIX}-target}}"
[[ $# -gt 0 ]] && shift
mkdir -p "$CACHE_DIR"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o "UserKnownHostsFile=$CACHE_DIR/known_hosts")
DEST="${GUEST_USER:-fedora}@qemu:system/$VM"
if [[ "${1:-}" = "--wait" ]]; then
  for _ in $(seq 1 "${WAIT_TRIES:-60}"); do
    ssh "${SSH_OPTS[@]}" -o ConnectTimeout=5 -o BatchMode=yes "$DEST" true 2>/dev/null && exit 0
    sleep 3
  done
  echo "$VM: no ssh over vsock yet (running? first boot finished?)" >&2
  exit 1
fi
exec ssh "${SSH_OPTS[@]}" "$DEST" "$@"
