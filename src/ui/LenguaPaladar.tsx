/** Corte sagital: la punta de la lengua descansa sobre la cresta alveolar. */
export function LenguaPaladar() {
  return (
    <svg
      viewBox="0 0 260 220"
      className="lengua-svg"
      role="img"
      aria-label="Corte sagital de la cabeza mirando a la derecha, con la boca cerrada: se ven los incisivos, el paladar duro y blando con la úvula, y la lengua ocupando el piso de la boca. Su punta toca la cresta alveolar, justo detrás de los dientes superiores, en el punto marcado aquí."
    >
      {/* Silueta de la cabeza, con nariz, labios en contacto, mentón y cuello. */}
      <path
        className="lengua-perfil"
        d="M42 210 C51 190 50 171 41 155 C24 128 20 94 27 54
           C30 27 47 13 69 9 C108 1 156 4 178 22 C190 33 194 47 192 60
           C193 69 201 77 210 85 L233 104 C238 108 235 114 229 116
           C225 118 220 117 216 117 C215 122 220 126 224 129
           C229 131 231 136 228 140 L224 143 C230 146 231 151 226 154
           C222 156 216 156 216 162 C218 176 214 183 201 189
           C190 194 176 196 165 198 L159 210"
      />

      {/* Cavidad oral y referencias discretas de la nariz y la faringe. */}
      <path
        className="lengua-cavidad"
        d="M82 130 C100 105 141 101 172 109 C187 114 199 119 204 126
           L210 145 C202 168 178 191 151 200 C123 210 96 204 79 201
           C69 188 66 170 69 154 Z"
      />
      <path
        className="lengua-interior"
        d="M92 102 C116 81 143 81 166 93 C181 101 187 107 195 113
           M73 90 C62 112 62 136 67 159 C72 179 77 192 68 210"
      />
      <path
        className="lengua-rasgo"
        d="M182 56 Q187 54 191 57
           M190 73 C186 88 189 102 201 110
           M220 113 Q225 110 229 113
           M224 143 C220 143 216 144 211 145"
      />

      {/* Una banda continua forma el paladar duro, el velo y la úvula colgante. */}
      <path
        className="lengua-paladar"
        d="M203 119 C195 110 185 106 173 104 C151 99 128 102 112 109
           C99 115 91 124 89 131 C88 134 90 136 92 136 L91 141
           C90 144 92 147 95 146 C98 145 98 142 97 139 L96 134
           C99 126 108 123 119 119
           C141 111 168 111 184 116 C190 118 193 121 195 123
           Q199 126 203 125 Z"
      />
      <path className="lengua-union" d="M124 105 C121 109 120 114 121 118" />

      {/* La encía inferior delimita el piso de la boca y la mandíbula. */}
      <path
        className="lengua-interior"
        d="M202 119 C210 121 215 132 213 141
           M211 148 C214 156 212 161 205 166
           C191 180 178 191 157 199 C130 212 95 207 83 199"
      />

      {/* Cuerpo ancho apoyado en el piso; la punta asciende detrás del incisivo. */}
      <path
        className="lengua-cuerpo"
        d="M79 201 C86 188 82 174 88 162 C96 144 113 138 131 140
           C149 143 165 148 178 139 C186 133 187 125 192 123
           Q194 122 195 123 C199 127 194 143 188 153
           C180 167 164 184 150 198 C134 209 101 209 79 201 Z"
      />
      <path className="lengua-relieve" d="M103 179 C121 187 141 183 157 174" />

      {/* Incisivos en corte, con las coronas enfrentadas dentro de los labios cerrados. */}
      <path
        className="lengua-diente"
        d="M202 121 C205 120 209 121 211 124 L214 141
           Q214 144 211 144 L205 143 Q203 143 203 140 Z"
      />
      <path
        className="lengua-diente"
        d="M204 149 L211 148 Q213 149 212 152 L208 165
           Q206 167 201 164 L202 152 Q202 150 204 149 Z"
      />

      {/* El punto coincide con el borde del paladar y la punta de la lengua. */}
      <path className="lengua-guia" d="M173 83 H183 L194 117" />
      <circle className="lengua-toque-halo" cx="195" cy="123" r="5.5" />
      <circle className="lengua-toque" cx="195" cy="123" r="2.5" />
      <text className="lengua-rotulo" x="167" y="87" textAnchor="end">
        aquí
      </text>
    </svg>
  );
}
