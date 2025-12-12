import daisyui from 'daisyui'

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
        },
	},
	plugins: [
		daisyui,
	],
	daisyui: {
        logs: false, // Mematikan log di terminal
		themes: [
			{
				light: {
                    // Kita definisikan manual warna Emerald-nya disini
                    // Ini otomatis menimpa settingan default tanpa perlu 'require' file lain
					"primary": "#10b981",          
					"primary-content": "#ffffff",  
					"secondary": "#34d399",        
					"accent": "#065f46",           
					"neutral": "#1f2937",          
					"base-100": "#ffffff",         
					"base-200": "#f3f4f6",         
                    "base-300": "#d1d5db",         
					
					"info": "#3abff8",
					"success": "#10b981", // Hijau Emerald
					"warning": "#fbbd23",
					"error": "#f87272",
				},
			},
		],
	},
}