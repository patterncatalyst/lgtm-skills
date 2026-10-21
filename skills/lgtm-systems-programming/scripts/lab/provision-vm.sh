#!/usr/bin/env bash
#
# provision-vm.sh — provision a Fedora KVM guest via cloud-init for a
# systems-programming / kernel test lab.
#
#   export LAB_PREFIX=myproject          # names everything (default: lab)
#   ./provision-vm.sh "$LAB_PREFIX-target"   # the deploy target
#   ./provision-vm.sh "$LAB_PREFIX-peer"     # optional 2nd host for networking tests
#
# The VM name is just the argument — pass whatever you like; LAB_PREFIX only
# provides sensible defaults elsewhere (lifecycle scripts, cache dir).
#
# Refuses to clobber an existing domain of the same name; run ./destroy-vm.sh
# <name> first for a clean rebuild.
#
# Requires (host): virt-install, qemu-img, cloud-localds, passt + passt-selinux,
# libvirt-ssh-proxy, libvirtd running, your
# user in the `libvirt` group (or wrap via `sg libvirt -c '...'`). See
# references/vm-lab.md.
#
# Downloads the Fedora Cloud Base qcow2 once into ~/.cache, then layers a per-VM
# overlay disk so re-provisioning is cheap and the base stays pristine.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)" && cd "$SCRIPT_DIR"
export LIBVIRT_DEFAULT_URI="${LIBVIRT_DEFAULT_URI:-qemu:///system}"

# ---- Config -----------------------------------------------------------------
LAB_PREFIX="${LAB_PREFIX:-lab}"
VM_NAME="${1:?usage: provision-vm.sh <vm-name>  (e.g. $LAB_PREFIX-target)}"
VCPUS="${VCPUS:-2}"
RAM_MB="${RAM_MB:-4096}"
DISK_GB="${DISK_GB:-20}"
SSH_PUBKEY="${SSH_PUBKEY:-$HOME/.ssh/id_ed25519.pub}"

# Fedora Cloud Base. Pin the exact image you tested; bump deliberately.
FEDORA_VER="${FEDORA_VER:-44}"
BASE_URL="https://download.fedoraproject.org/pub/fedora/linux/releases/${FEDORA_VER}/Cloud/x86_64/images"
BASE_IMG="${BASE_IMG:-Fedora-Cloud-Base-Generic-${FEDORA_VER}-1.7.x86_64.qcow2}"  # verify exact name at the URL above
CACHE_DIR="${LAB_CACHE:-$HOME/.cache/${LAB_PREFIX}-lab}"

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; CYN=$'\033[0;36m'; YLW=$'\033[1;33m'; RST=$'\033[0m'
step() { echo "${CYN}━━ $*${RST}"; }
ok()   { echo "${GRN}✓ $*${RST}"; }
warn() { echo "${YLW}⚠ $*${RST}"; }
die()  { echo "${RED}✗ $*${RST}" >&2; exit 1; }

# ---- Pre-flight -------------------------------------------------------------
command -v virt-install >/dev/null || die "virt-install not found (dnf install virt-install)"
command -v cloud-localds >/dev/null || die "cloud-localds not found (dnf install cloud-utils)"
command -v passt >/dev/null || die "passt not found (dnf install passt passt-selinux)"
[[ -x /usr/libexec/libvirt-ssh-proxy ]] || die "libvirt-ssh-proxy not found (dnf install libvirt-ssh-proxy)"
[[ -f "$SSH_PUBKEY" ]] || die "no SSH public key at $SSH_PUBKEY — generate one: ssh-keygen -t ed25519"
virsh dominfo "$VM_NAME" >/dev/null 2>&1 && \
  die "domain '$VM_NAME' already exists — run ./destroy-vm.sh $VM_NAME first"

mkdir -p "$CACHE_DIR"

# ---- Base image -------------------------------------------------------------
step "ensuring Fedora ${FEDORA_VER} Cloud Base image is cached"
if [[ ! -f "$CACHE_DIR/$BASE_IMG" ]]; then
  warn "downloading $BASE_IMG (verify the exact filename at $BASE_URL)"
  curl -fL --retry 3 -o "$CACHE_DIR/$BASE_IMG" "$BASE_URL/$BASE_IMG"
fi
ok "base image present: $CACHE_DIR/$BASE_IMG"

# ---- Per-VM overlay disk ----------------------------------------------------
step "creating ${DISK_GB}G overlay disk for $VM_NAME"
OVERLAY="$CACHE_DIR/${VM_NAME}.qcow2"
qemu-img create -f qcow2 -F qcow2 -b "$CACHE_DIR/$BASE_IMG" "$OVERLAY" "${DISK_GB}G"
ok "overlay: $OVERLAY"

# ---- cloud-init seed --------------------------------------------------------
step "building cloud-init seed for $VM_NAME"
PUBKEY_CONTENT="$(cat "$SSH_PUBKEY")"
TMP_USERDATA="$(mktemp)"
sed -e "s|__HOSTNAME__|${VM_NAME}|g" \
    -e "s|__SSH_PUBKEY__|${PUBKEY_CONTENT}|g" \
    cloud-init/user-data.tmpl > "$TMP_USERDATA"
SEED="$CACHE_DIR/${VM_NAME}-seed.img"
cloud-localds "$SEED" "$TMP_USERDATA" cloud-init/meta-data
rm -f "$TMP_USERDATA"
ok "seed: $SEED"

# ---- Boot the domain --------------------------------------------------------
# Networking is passt (user-mode): the guest's traffic leaves through ordinary
# unprivileged sockets on the host, so no bridge, NAT, forwarding or firewall
# rule is involved and the host's firewall (Docker's FORWARD DROP included)
# cannot interfere. ssh goes over AF_VSOCK via libvirt's ssh proxy:
#   ./lab-ssh.sh <vm>   (ssh -F <generated config> <vm>)
step "starting domain $VM_NAME ($VCPUS vCPU / ${RAM_MB}MB / ${DISK_GB}G), passt networking, ssh over vsock"
virt-install \
  --name "$VM_NAME" \
  --memory "$RAM_MB" \
  --vcpus "$VCPUS" \
  --cpu host-passthrough \
  --import \
  --disk "path=$OVERLAY,format=qcow2,bus=virtio" \
  --disk "path=$SEED,device=cdrom" \
  --os-variant fedora-unknown \
  --network "type=user,backend.type=passt,model=virtio" \
  --vsock cid.auto=yes \
  --graphics none \
  --noautoconsole

ssh-keygen -q -f "$CACHE_DIR/known_hosts" -R "qemu:system/$VM_NAME" >/dev/null 2>&1 || true
ok "domain $VM_NAME created"
echo
echo "Wait for cloud-init, then confirm it's ready (expect 'BTF: present'):"
echo "    ./lab-ssh.sh $VM_NAME cat /var/log/lab-ready"
echo "then snapshot the tooled baseline:"
echo "    ./snapshot-vm.sh $VM_NAME"
