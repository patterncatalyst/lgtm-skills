#!/usr/bin/env bash
# destroy-vm.sh — tear a guest all the way down, including its disks.
#   ./destroy-vm.sh myproject-target
set -euo pipefail
export LIBVIRT_DEFAULT_URI="${LIBVIRT_DEFAULT_URI:-qemu:///system}"
LAB_PREFIX="${LAB_PREFIX:-lab}"
CACHE_DIR="${LAB_CACHE:-$HOME/.cache/${LAB_PREFIX}-lab}"
VM="${1:?usage: destroy-vm.sh <vm-name>}"
virsh destroy "$VM" 2>/dev/null || true
# --snapshots-metadata: undefine refuses a domain that still has snapshots.
virsh undefine "$VM" --remove-all-storage --nvram --snapshots-metadata 2>/dev/null \
  || virsh undefine "$VM" --snapshots-metadata 2>/dev/null || true
if virsh dominfo "$VM" >/dev/null 2>&1; then
  echo "failed to undefine $VM; see: virsh undefine $VM --snapshots-metadata" >&2
  exit 1
fi
rm -f "$CACHE_DIR/${VM}.qcow2" "$CACHE_DIR/${VM}-seed.img"
ssh-keygen -q -f "$CACHE_DIR/known_hosts" -R "qemu:system/$VM" >/dev/null 2>&1 || true
echo "destroyed $VM"
