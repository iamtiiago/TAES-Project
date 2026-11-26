Feature: US05 - Adicionar alimentos manualmente

  Background:
    Given que abri a despensa num navegador de teste

  Scenario: Adicionar um alimento com os dados válidos
    When guardo o alimento "Arroz" em "Despensa" com "1.5" "kg" e validade "2030-12-31"
    Then vejo a confirmação de gravação

  Scenario: Apresentar o alimento guardado na despensa
    When guardo o alimento "Leite" em "Frigorífico" com "1" "L" e validade "2030-12-31"
    Then vejo "Leite" na lista com categoria "Frigorífico", quantidade "1 L" e validade "31/12/2030"

  Scenario: Impedir a gravação de um alimento sem nome
    When guardo o alimento "   " em "Despensa" com "1" "kg" e validade "2030-12-31"
    Then vejo um erro a pedir o nome do alimento
    And a lista da despensa continua vazia

  Scenario: Conservar o alimento após reabrir a aplicação
    When guardo o alimento "Ervilhas" em "Congelador" com "500" "g" e validade "2030-12-31"
    Then vejo a confirmação de gravação
    When reabro a aplicação e volto à despensa
    Then vejo "Ervilhas" na lista com categoria "Congelador", quantidade "500 g" e validade "31/12/2030"
