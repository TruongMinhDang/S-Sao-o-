{ pkgs }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_20
    pkgs.git
    pkgs.openssl
    pkgs.bash
  ];

  idx.extensions = [ ];

  idx.previews = {
    previews = {
      web = {
        # Dùng port do Studio cấp, không cố định.
        command = [
          "bash" "-lc"
          "cd apps/web && npm run dev -- --port $PORT --hostname 0.0.0.0"
        ];
        manager = "web";
      };
    };
  };
}
