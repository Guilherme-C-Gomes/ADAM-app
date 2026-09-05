import { useEffect, useState } from 'react'

/**
 * Simula a espera por dados enquanto o backend nao existe.
 *
 * Serve para exercitar os estados de carregamento das telas na
 * demonstracao. Quando o Supabase entrar, cada tela troca isto pelo
 * `isLoading` da consulta real e o resto do codigo nao muda.
 */
export function useCarregamento(ms = 700) {
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const id = setTimeout(() => setCarregando(false), ms)
    return () => clearTimeout(id)
  }, [ms])

  return carregando
}
