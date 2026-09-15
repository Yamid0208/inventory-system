import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (overlay()) {
      <!-- Overlay modal a pantalla completa con desenfoque de fondo -->
      <div
        class="fixed inset-0 z-[9999] bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-fadeIn"
        role="status"
        aria-live="polite"
        aria-label="Cargando servicios">
        
        <!-- Tarjeta flotante con estética StockFlow -->
        <div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 sm:p-10 shadow-2xl shadow-slate-900/15 dark:shadow-black/60 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center max-w-[290px] sm:max-w-[320px] w-full transform transition-all animate-scaleUp">
          
          <!-- Ilustración animada Isotipo StockFlow (Caja 3D con Anillo Orbital Planetario) -->
          <div class="relative w-36 h-36 flex items-center justify-center mb-4 select-none">
            <ng-container *ngTemplateOutlet="animatedLogoTemplate"></ng-container>
          </div>

          <!-- Tipografía de Marca StockFlow -->
          <div class="font-extrabold text-2xl tracking-tight text-slate-800 dark:text-white lowercase flex items-baseline">
            <span>stockflow</span>
            <span class="text-primary-500 font-black ml-0.5 animate-pulse">.</span>
          </div>

          <!-- Mensaje contextual dinámico de carga con puntos suspensivos animados -->
          <div class="mt-2 text-sm font-medium text-slate-400 dark:text-slate-400 flex items-center justify-center gap-1">
            <span>{{ displayMessage() }}</span>
            <span class="inline-flex items-center space-x-0.5 ml-0.5 text-primary-500">
              <span class="dot-bounce dot-1">.</span>
              <span class="dot-bounce dot-2">.</span>
              <span class="dot-bounce dot-3">.</span>
            </span>
          </div>
        </div>
      </div>
    } @else {
      <!-- Modo Inline para componentes, tarjetas y tablas -->
      <div
        class="py-8 px-4 flex flex-col items-center justify-center w-full text-center"
        role="status"
        aria-live="polite">
        
        <div class="relative w-28 h-28 flex items-center justify-center mb-3 select-none">
          <ng-container *ngTemplateOutlet="animatedLogoTemplate"></ng-container>
        </div>

        <div class="font-bold text-lg tracking-tight text-slate-800 dark:text-white lowercase flex items-baseline">
          <span>stockflow</span>
          <span class="text-primary-500 font-black ml-0.5">.</span>
        </div>

        <div class="mt-1 text-xs font-medium text-slate-400 flex items-center justify-center gap-1">
          <span>{{ displayMessage() }}</span>
          <span class="inline-flex items-center space-x-0.5 ml-0.5 text-primary-500">
            <span class="dot-bounce dot-1">.</span>
            <span class="dot-bounce dot-2">.</span>
            <span class="dot-bounce dot-3">.</span>
          </span>
        </div>
      </div>
    }

    <!-- Template reutilizable de la ilustración vectorial y orbital animada -->
    <ng-template #animatedLogoTemplate>
      <!-- Halo difuso cálido de fondo -->
      <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-primary-500/20 via-primary-300/25 to-transparent blur-xl pointer-events-none stockflow-glow"></div>

      <svg
        viewBox="0 0 200 180"
        class="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        
        <defs>
          <!-- Gradientes para la caja y hexágono de marca -->
          <linearGradient id="sf-hex-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff7762" />
            <stop offset="50%" stop-color="#ff5b46" />
            <stop offset="100%" stop-color="#f0432d" />
          </linearGradient>

          <linearGradient id="sf-cube-right" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff7762" />
            <stop offset="100%" stop-color="#ff5b46" />
          </linearGradient>

          <linearGradient id="sf-cube-left" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#f8fafc" />
          </linearGradient>

          <linearGradient id="sf-cube-front" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f1f5f9" />
            <stop offset="100%" stop-color="#e2e8f0" />
          </linearGradient>

          <!-- Gradientes para el anillo planetario orbital -->
          <linearGradient id="sf-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffa797" />
            <stop offset="35%" stop-color="#ff7762" />
            <stop offset="70%" stop-color="#ff5b46" />
            <stop offset="100%" stop-color="#f0432d" />
          </linearGradient>

          <linearGradient id="sf-ring-glow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ffccc2" stop-opacity="0.8" />
            <stop offset="50%" stop-color="#ff5b46" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#f0432d" stop-opacity="0.1" />
          </linearGradient>

          <!-- Filtro de sombra suave para 3D -->
          <filter id="sf-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#f0432d" flood-opacity="0.28" />
          </filter>

          <filter id="sf-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000000" flood-opacity="0.12" />
          </filter>
        </defs>

        <!-- PARTE POSTERIOR DEL ANILLO ORBITAL (Pasa por detrás del paquete) -->
        <g class="stockflow-orbit-back" transform="rotate(-26 100 88)">
          <!-- Arco trasero del anillo elíptico -->
          <path
            d="M 22 88 A 78 24 0 0 1 178 88"
            stroke="url(#sf-ring-grad)"
            stroke-width="11"
            stroke-linecap="round"
            opacity="0.85" />
          <!-- Detalle de luz posterior -->
          <path
            d="M 35 88 A 65 19 0 0 1 165 88"
            stroke="url(#sf-ring-glow)"
            stroke-width="3"
            stroke-linecap="round" />
        </g>

        <!-- NÚCLEO CENTRAL FLOTANTE: Hexágono Coral + Paquete Isométrico Blanco 3D -->
        <g class="stockflow-floating-core">
          <!-- Sombra proyectada del núcleo -->
          <ellipse cx="100" cy="142" rx="34" ry="7" fill="#000000" opacity="0.08" class="stockflow-core-shadow" />

          <!-- Hexágono base coral estilizado con esquinas redondeadas -->
          <g filter="url(#sf-shadow)">
            <path
              d="M 100 42 
                 C 106 42, 134 58, 138 61 
                 C 142 64, 142 70, 142 76 
                 L 142 100 
                 C 142 106, 138 112, 134 115 
                 L 106 131 
                 C 102 133, 98 133, 94 131 
                 L 66 115 
                 C 62 112, 58 106, 58 100 
                 L 58 76 
                 C 58 70, 62 64, 66 61 
                 C 70 58, 94 42, 100 42 Z"
              fill="url(#sf-hex-grad)" />
          </g>

          <!-- Caja isométrica en perspectiva 3D (Blanca / Caras contrastadas de paquete) -->
          <g id="isometric-box" transform="translate(0, 2)" filter="url(#sf-soft-shadow)">
            <!-- Cara Superior de la Caja (Tapa Blanca Limpia) -->
            <polygon
              points="100,58 124,71 100,84 76,71"
              fill="url(#sf-cube-left)"
              stroke="#ffffff"
              stroke-width="0.8" />
            
            <!-- Cara Izquierda de la Caja (Sombra sutil) -->
            <polygon
              points="76,71 100,84 100,111 76,98"
              fill="url(#sf-cube-front)" />

            <!-- Cara Derecha de la Caja (Acento coral / marca de cinta) -->
            <polygon
              points="100,84 124,71 124,98 100,111"
              fill="url(#sf-cube-right)" />

            <!-- Detalle de cinta / embalaje de la caja (Estilo Isotipo) -->
            <!-- Cinta en cara superior -->
            <polygon
              points="94,61 106,68 106,74 94,67"
              fill="#ff5b46"
              opacity="0.85" />
            <!-- Cinta en cara frontal derecha -->
            <polygon
              points="108,80 116,75 116,102 108,107"
              fill="#f0432d"
              opacity="0.9" />
          </g>
        </g>

        <!-- PARTE FRONTAL DEL ANILLO ORBITAL (Pasa por DELANTE del paquete) -->
        <g class="stockflow-orbit-front" transform="rotate(-26 100 88)">
          <!-- Arco frontal del anillo elíptico -->
          <path
            d="M 178 88 A 78 24 0 0 1 22 88"
            stroke="url(#sf-ring-grad)"
            stroke-width="11"
            stroke-linecap="round" />

          <!-- Resalte de brillo frontal -->
          <path
            d="M 165 88 A 65 19 0 0 1 35 88"
            stroke="#ffffff"
            stroke-width="1.8"
            stroke-linecap="round"
            opacity="0.6" />

          <!-- SATÉLITES / ESFERAS ORBITALES -->
          <!-- Esfera principal frontal izquierda (planetoide coral con luz 3D) -->
          <g class="stockflow-satellite-1">
            <circle cx="28" cy="94" r="10" fill="url(#sf-hex-grad)" filter="url(#sf-shadow)" />
            <circle cx="25" cy="91" r="3.5" fill="#ffffff" opacity="0.6" />
          </g>

          <!-- Esfera secundaria orbital frontal derecha (pequeña) -->
          <g class="stockflow-satellite-2">
            <circle cx="168" cy="80" r="6" fill="#ffa797" opacity="0.95" />
            <circle cx="166" cy="78" r="2" fill="#ffffff" opacity="0.8" />
          </g>
        </g>
      </svg>
    </ng-template>
  `,
  styles: [`
    /* Animación de entrada suave */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-scaleUp {
      animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Animación de levitación/flotación del núcleo */
    @keyframes stockflowFloat {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-6px);
      }
    }
    .stockflow-floating-core {
      animation: stockflowFloat 3s ease-in-out infinite;
      transform-origin: center center;
    }

    /* Sombra dinámica bajo el núcleo que responde a la levitación */
    @keyframes shadowBreath {
      0%, 100% {
        transform: scale(1);
        opacity: 0.10;
      }
      50% {
        transform: scale(0.85);
        opacity: 0.05;
      }
    }
    .stockflow-core-shadow {
      animation: shadowBreath 3s ease-in-out infinite;
      transform-origin: 100px 142px;
    }

    /* Animación del halo difuso de fondo */
    @keyframes pulseGlow {
      0%, 100% {
        transform: scale(0.95);
        opacity: 0.5;
      }
      50% {
        transform: scale(1.08);
        opacity: 0.85;
      }
    }
    .stockflow-glow {
      animation: pulseGlow 2.5s ease-in-out infinite;
    }

    /* Animación sutil de micro-oscilación de los anillos orbitales */
    @keyframes ringWobble {
      0%, 100% {
        transform: rotate(-26deg) scale(1);
      }
      50% {
        transform: rotate(-24deg) scale(1.02);
      }
    }
    .stockflow-orbit-back,
    .stockflow-orbit-front {
      animation: ringWobble 4s ease-in-out infinite;
      transform-origin: 100px 88px;
    }

    /* Satélites con suave micro-pulso */
    @keyframes satPulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.08);
      }
    }
    .stockflow-satellite-1 {
      animation: satPulse 2s ease-in-out infinite;
      transform-origin: 28px 94px;
    }
    .stockflow-satellite-2 {
      animation: satPulse 2.5s ease-in-out infinite 0.4s;
      transform-origin: 168px 80px;
    }

    /* Puntos suspensivos animados */
    @keyframes dotBounce {
      0%, 80%, 100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      40% {
        transform: translateY(-3px);
        opacity: 1;
      }
    }
    .dot-bounce {
      display: inline-block;
      animation: dotBounce 1.4s infinite ease-in-out both;
      font-size: 1.25rem;
      line-height: 0.5;
    }
    .dot-1 { animation-delay: -0.32s; }
    .dot-2 { animation-delay: -0.16s; }
    .dot-3 { animation-delay: 0s; }

    /* Respeto a las preferencias de accesibilidad de movimiento reducido */
    @media (prefers-reduced-motion: reduce) {
      .stockflow-floating-core,
      .stockflow-core-shadow,
      .stockflow-glow,
      .stockflow-orbit-back,
      .stockflow-orbit-front,
      .stockflow-satellite-1,
      .stockflow-satellite-2,
      .dot-bounce,
      .animate-fadeIn,
      .animate-scaleUp {
        animation: none !important;
        transition: none !important;
      }
    }
  `]
})
export class AppLoadingComponent {
  message = input<string>('Cargando servicios...');
  overlay = input<boolean>(false);

  /** Remueve sufijo "..." si ya viene en el mensaje para renderizar los puntos animados uniformemente */
  readonly displayMessage = computed(() => {
    const raw = this.message() || 'Cargando servicios';
    return raw.replace(/\.+$/, '');
  });
}
