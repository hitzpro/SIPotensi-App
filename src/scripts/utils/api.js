// src/scripts/utils/api.js
import { API_CONFIG } from '../config';

/**
 * Helper untuk melakukan POST request ke API
 * @param {string} endpoint - contoh: '/login'
 * @param {object} body - data yang akan dikirim (JSON)
 */
export async function postData(endpoint, body) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Opsional: Otomatis ambil token jika ada di localStorage (untuk request masa depan)
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    // Cek dulu apakah responnya valid JSON
    const contentType = response.headers.get("content-type");
    let result;
    if (contentType && contentType.indexOf("application/json") !== -1) {
      result = await response.json();
    } else {
      // Fallback jika server error html/text
      result = { message: await response.text() }; 
    }

    return {
      ok: response.ok,
      status: response.status,
      data: result
    };

  } catch (error) {
    console.error("API Fetch Error:", error);
    return {
      ok: false,
      status: 500,
      data: { message: "Gagal terhubung ke server (Network Error)." }
    };
  }
}

/**
 * Helper untuk melakukan GET request ke API
 */
export async function getData(endpoint) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
  
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
  
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: headers,
      });
  
      const contentType = response.headers.get("content-type");
      let result;
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
      } else {
        result = { message: await response.text() }; 
      }
  
      return {
        ok: response.ok,
        status: response.status,
        data: result
      };
  
    } catch (error) {
      console.error("API Fetch Error:", error);
      return {
        ok: false,
        status: 500,
        data: { message: "Gagal terhubung ke server." }
      };
    }
  }
  
  // Tambahkan juga fungsi DELETE karena nanti ada tombol hapus kelas
  export async function deleteData(endpoint) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
          method: 'DELETE',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
        });
        return { ok: response.ok, status: response.status };
      } catch (error) {
        return { ok: false, status: 500 };
      }
    }

    export async function putData(endpoint, body) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body),
        });
    
        const result = await response.json();
        return { ok: response.ok, status: response.status, data: result };
    
      } catch (error) {
        console.error(error);
        return { ok: false, status: 500, data: { message: "Error Network" } };
      }
    }