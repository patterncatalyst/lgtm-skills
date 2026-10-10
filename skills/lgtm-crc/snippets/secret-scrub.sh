# shellcheck shell=bash
# secret-scrub.sh — fail if evidence contains secret material (sourced
# snippet; capture-evidence.sh has the full version).
#
# The real value is read into a variable, compared, and unset: never echoed,
# never written. Patterns cover OpenShift tokens, private keys, the
# kubeadmin password file name and pull-secret JSON.
scrub_evidence() {
    local dir="$1" secret_name="$2" ns="$3" leaks=0 value
    if oc get secret "$secret_name" -n "$ns" >/dev/null 2>&1; then
        value="$(oc get secret "$secret_name" -n "$ns" -o jsonpath='{.data.password}' | base64 -d)"
        [[ -n "$value" ]] && grep -rqF -- "$value" "$dir" && { echo "    password found in $dir" >&2; leaks=1; }
        unset value
    fi
    grep -rlE 'sha256~[A-Za-z0-9_-]{20,}|BEGIN [A-Z ]*PRIVATE KEY|kubeadmin-password|"token"|"auths"' "$dir" >&2 && leaks=1
    return "$leaks"
}
