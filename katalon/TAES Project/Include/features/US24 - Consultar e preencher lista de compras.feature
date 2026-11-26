Feature: US24 - Consultar e preencher a lista de compras

  Background:
    Given que abri a aplicação com um perfil de teste para a lista de compras

  Scenario: Abrir uma lista de compras vazia
    When abro a lista de compras no dashboard
    Then vejo que a lista de compras está vazia

  Scenario: Adicionar um produto manualmente
    When abro a lista de compras no dashboard
    And adiciono "Arroz de teste" com quantidade "2" e unidade "kg"
    Then vejo "Arroz de teste" na lista com quantidade "2 kg"

  Scenario: Consultar a lista depois de recarregar
    When abro a lista de compras no dashboard
    And adiciono "Leite de teste" com quantidade "1" e unidade "L"
    And recarrego a aplicação e volto à lista de compras
    Then vejo "Leite de teste" na lista com quantidade "1 L"

  Scenario: Abrir a lista pelo cabeçalho da despensa
    When abro a lista de compras pelo cabeçalho da despensa
    Then vejo a página da lista de compras

  Scenario: Abrir a lista pelo cabeçalho das receitas
    When abro a lista de compras pelo cabeçalho das receitas
    Then vejo a página da lista de compras
