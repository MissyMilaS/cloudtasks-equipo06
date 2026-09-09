import { put, list, del } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    // GET - Listar todas las tareas
    if (req.method === 'GET') {
      const { blobs } = await list({
        prefix: 'tareas/',
        limit: 1000
      });
      
      const tasks = await Promise.all(
        blobs.map(async (blob) => {
          const response = await fetch(blob.url);
          return response.json();
        })
      );
      
      return res.status(200).json(tasks);
    }

    // POST - Crear una tarea
    if (req.method === 'POST') {
      const { title, description, deadline, priority, status } = req.body;
      const id = Date.now();
      
      const task = {
        id,
        title,
        description,
        deadline,
        priority,
        status,
        created_at: new Date().toISOString()
      };
      
      await put(`tareas/tarea-${id}.json`, JSON.stringify(task), {
        access: 'public',
        contentType: 'application/json'
      });
      
      return res.status(201).json(task);
    }

    // PUT - Actualizar una tarea
    if (req.method === 'PUT') {
      const { id, title, description, deadline, priority, status } = req.body;
      
      const task = {
        id,
        title,
        description,
        deadline,
        priority,
        status,
        created_at: new Date().toISOString()
      };
      
      await put(`tareas/tarea-${id}.json`, JSON.stringify(task), {
        access: 'public',
        contentType: 'application/json'
      });
      
      return res.status(200).json(task);
    }

    // DELETE - Eliminar una tarea
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await del(`tareas/tarea-${id}.json`);
      return res.status(204).end();
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}