#!/usr/bin/env bash
# lab-up.sh — start the lab guests and wait until ssh over vsock answers.
#   export LAB_PREFIX=myproject
#   ./lab-up.sh
#
# Starts <prefix>-target and <prefix>-peer if defined but not running, then waits
# for sshd over vsock. If a guest isn't defined yet, it tells you to provision it.
set -euo pipefail
export LIBVIRT_DEFAULT_URI="${LIBVIRT_DEFAULT_URI:-qemu:///system}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAB_PREFIX="${LAB_PREFIX:-lab}"
TARGET="${TARGET_VM:-${LAB_PREFIX}-target}"; PEER="${PEER_VM:-${LAB_PREFIX}-peer}"

for VM in "$TARGET" "$PEER"; do
  if ! virsh dominfo "$VM" >/dev/null 2>&1; then
    echo "skip $VM (not defined — provision it: $SCRIPT_DIR/provision-vm.sh $VM)" >&2
    continue
  fi
  state="$(virsh domstate "$VM" 2>/dev/null || echo unknown)"
  if [ "$state" = "running" ]; then echo "$VM already running"; else echo "starting $VM"; virsh start "$VM" >/dev/null 2>&1 || true; fi
done

echo "waiting for ssh over vsock ..." >&2
for VM in "$TARGET" "$PEER"; do
  virsh dominfo "$VM" >/dev/null 2>&1 || continue
  if "$SCRIPT_DIR/lab-ssh.sh" "$VM" --wait; then echo "$VM: ssh fedora@qemu:system/$VM  (or $SCRIPT_DIR/lab-ssh.sh $VM)"; fi
done
